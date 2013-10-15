/* not segmented
 * <g> <-> scenes.$g
 *    <path ... /> only segment
 * </g>
 *
 * segmented full
 * <g> <-> scenes.$g
 *    <path ... /> instance 0
 *    <path ... /> instance 1
 *    ...
 * </g>
 *
 * segmented smart
 * <g> <-> scenes.$g
 *    <path /> segment 0
 *    <path /> segment 1
 * </g>
 */
pv.SvgScene.line = function(scenes) {
  var e = scenes.$g.firstChild;
  
  var count = scenes.length;
  if (!count){
    return e;
  }
  
  var s = scenes[0];
  
  /* smart segmentation */
  if (s.segmented === 'smart') {
    return this.lineSegmentedSmart(e, scenes);
  }
  
  if (count < 2) {
    return e;
  }
  
  /* full segmentation */
  if (s.segmented) {
    return this.lineSegmentedFull(e, scenes);
  }

  return this.lineFixed(e, scenes);
};

pv.SvgScene.lineFixed = function(elm, scenes) {
  
  var count = scenes.length; 
  
  // count > 0
  
  if(count === 1){
    return this.lineAreaDotAlone(elm, scenes, 0);
  }
  
  var s = scenes[0];
  if (!s.visible) {
    return elm;
  }
  
  /* fill & stroke */
  
  var fill   = s.fillStyle;
  var stroke = s.strokeStyle;
  
  if (!fill.opacity && !stroke.opacity) {
    return elm;
  }
  
  this.addFillStyleDefinition(scenes, fill);
  this.addFillStyleDefinition(scenes, stroke);
  
  /* points */
  var d = "M" + s.left + "," + s.top;
  
  var curveInterpolated = (count > 2);
  if(curveInterpolated) {
    switch(s.interpolate) {
      case "basis":    d += this.curveBasis   (scenes); break;
      case "cardinal": d += this.curveCardinal(scenes, s.tension); break;
      case "monotone": d += this.curveMonotone(scenes); break;
      default: curveInterpolated = false;
    }
  }
  
  if(!curveInterpolated){
    for (var i = 1 ; i < count ; i++) {
      d += this.lineSegmentPath(scenes[i - 1], scenes[i]);
    }
  }
  
  var sop = stroke.opacity;
  var attrs = {
    'shape-rendering':   s.antialias ? null : 'crispEdges',
    'pointer-events':    s.events,
    'cursor':            s.cursor,
    'd':                 d,
    'fill':              fill.color,
    'fill-opacity':      fill.opacity || null,
    'stroke':            stroke.color,
    'stroke-opacity':    sop || null,
    'stroke-width':      sop ? (s.lineWidth / this.scale) : null,
    'stroke-linecap':    s.lineCap,
    'stroke-linejoin':   s.lineJoin,
    'stroke-miterlimit': s.strokeMiterLimit,
    'stroke-dasharray':  sop ? this.parseDasharray(s) : null
  };
  
  elm = this.expect(elm, 'path', scenes, 0, attrs, s.css);

  if(s.svg) this.setAttributes(elm, s.svg);
  
  return this.append(elm, scenes, 0);
};

pv.SvgScene.lineSegmentedSmart = function(elm, scenes) {
  return this.eachLineAreaSegment(elm, scenes, function(elm, scenes, from, to){
    
    // Paths depend only on visibility
    var paths = this.lineSegmentPaths(scenes, from, to);
    var fromp = from;
    
    // Split this visual scenes segment, 
    // on key properties changes
    var options = {
        breakOnKeyChange: true,
        from:  from,
        to:    to
      };
    
    return this.eachLineAreaSegment(elm, scenes, options, function(elm, scenes, from, to, ka, eventsMax){
      
      var s1 = scenes[from];
      
      var fill = s1.fillStyle;
      this.addFillStyleDefinition(scenes, fill);
      
      var stroke = s1.strokeStyle;
      this.addFillStyleDefinition(scenes, stroke);
      
      if(from === to){
        // Visual and events
        return this.lineAreaDotAlone(elm, scenes, from);
      }
      
      var d = this.lineJoinPaths(paths, from - fromp, to - fromp - 1); // N - 1 paths connect N points
      
      var sop = stroke.opacity;
      var attrs = {
        'shape-rendering':   s1.antialias ? null : 'crispEdges',
        'pointer-events':    eventsMax,
        'cursor':            s1.cursor,
        'd':                 d,
        'fill':              fill.color,
        'fill-opacity':      fill.opacity || null,
        'stroke':            stroke.color,
        'stroke-opacity':    sop || null,
        'stroke-width':      sop ? (s1.lineWidth / this.scale) : null,
        'stroke-linecap':    s1.lineCap,
        'stroke-linejoin':   s1.lineJoin,
        'stroke-miterlimit': s1.strokeMiterLimit,
        'stroke-dasharray':  sop ? this.parseDasharray(s1) : null
      };
      
      elm = this.expect(elm, 'path', scenes, from, attrs, s1.css);

      return this.append(elm, scenes, from);
    });
  });
};

pv.SvgScene.lineSegmentedFull = function(e, scenes) {
  var s = scenes[0];
  var paths;
  switch (s.interpolate) {
    case "basis":    paths = this.curveBasisSegments(scenes); break;
    case "cardinal": paths = this.curveCardinalSegments(scenes, s.tension); break;
    case "monotone": paths = this.curveMonotoneSegments(scenes); break;
  }

  for (var i = 0, n = scenes.length - 1; i < n; i++) {
    var s1 = scenes[i], s2 = scenes[i + 1];

    /* visible */
    if (!s1.visible || !s2.visible) continue;
    var stroke = s1.strokeStyle, fill = pv.FillStyle.transparent;
    if (!stroke.opacity) continue;

    /* interpolate */
    var d;
    if ((s1.interpolate == "linear") && (s1.lineJoin == "miter")) {
      fill = stroke;
      stroke = pv.FillStyle.transparent;
      d = this.pathJoin(scenes[i - 1], s1, s2, scenes[i + 2]);
    } else if(paths) {
      d = paths[i].join("");
    } else {
      d = "M" + s1.left + "," + s1.top + this.lineSegmentPath(s1, s2);
    }

    e = this.expect(e, "path", scenes, i, {
        "shape-rendering": s1.antialias ? null : "crispEdges",
        "pointer-events": s1.events,
        "cursor": s1.cursor,
        "d": d,
        "fill": fill.color,
        "fill-opacity": fill.opacity || null,
        "stroke": stroke.color,
        "stroke-opacity": stroke.opacity || null,
        "stroke-width": stroke.opacity ? s1.lineWidth / this.scale : null,
        "stroke-linejoin": s1.lineJoin
      });
    
    if(s1.svg) this.setAttributes(e, s1.svg);
    if(s1.css) this.setStyle(e, s1.css);

    e = this.append(e, scenes, i);
  }
  return e;
};

/** @private Returns the path segment for the specified points. */
pv.SvgScene.lineSegmentPath = function(s1, s2) {
  var l = 1; // sweep-flag
  switch (s1.interpolate) {
    case "polar-reverse":
      l = 0;
    case "polar": {
      var dx = s2.left - s1.left,
          dy = s2.top - s1.top,
          e = 1 - s1.eccentricity,
          r = Math.sqrt(dx * dx + dy * dy) / (2 * e);
      if ((e <= 0) || (e > 1)) break; // draw a straight line
      return "A" + r + "," + r + " 0 0," + l + " " + s2.left + "," + s2.top;
    }
    case "step-before": return "V" + s2.top + "H" + s2.left;
    case "step-after":  return "H" + s2.left + "V" + s2.top;
  }
  return "L" + s2.left + "," + s2.top;
};

pv.SvgScene.lineSegmentPaths = function(scenes, from, to) {
  var s = scenes[from];
  
  var paths;
  switch (s.interpolate) {
    case "basis":    paths = this.curveBasisSegments   (scenes, from, to); break;
    case "cardinal": paths = this.curveCardinalSegments(scenes, s.tension, from, to); break;
    case "monotone": paths = this.curveMonotoneSegments(scenes, from, to); break;
  }
  
  //"polar-reverse", "polar", "step-before", "step-after", and linear
  if(!paths || !paths.length){ // not curve interpolation or not enough points for it 
    paths = [];
    for (var i = from + 1 ; i <= to ; i++) {
      var s1 = scenes[i - 1];
      var s2 = scenes[i    ];
      paths.push(["M" + s1.left + "," + s1.top, this.lineSegmentPath(s1, s2)]);
    }
  }
  
  return paths;
};

/* 
  MITER / BEVEL JOIN calculation

  Normal line p1->p2 bounding box points  (a-b-c-d)

                    ^ w12 
  a-----------------|--------------b       ^
  |                 |              |       |
  p1           <----+p12           p2      | w1
  |                                |       |
  d--------------------------------c       v
  
  Points are added in the following order:
  d -> a -> b -> c
  
  Depending on the position of p0 in relation to the segment p1-p2,
  'a' may be the outer corner and 'd' the inner corner, 
  or the opposite:
  
  Ex1:
       outer side
       
         p1 ---- p2
       /   
     p0    inner side
     
     a is outer, d is inner
     
  Ex2:
      
     p0    inner side
       \
         p1 ---- p2
         
       outer side
       
     a is inner, d is outer
     
  =====================
  
    ^ v1
     \
      am
       *--a------ ... ----b
        \ |               |
          p1              p2
          |\              |
          d-*---- ... ----c
            dm\
               \
                v
                v1


  NOTE: 
  As yy points down, and because of the way Vector.perp() is written,
  perp() corresponds to rotating 90� clockwise.
  
  -----
  
  The miter (ratio) limit is
  the limit on the ratio of the miter length to the line width.
  
  The miter length is the distance between the 
  outer corner and the inner corner of the miter.
*/
pv.strokeMiterLimit = 4;

/** @private Returns the miter join path for the specified points. */
pv.SvgScene.pathJoin = function(s0, s1, s2, s3) {
  /*
   * P1-P2 is the current line segment. 
   * V is a vector that is perpendicular to the line segment, and has length lineWidth / 2. 
   * ABCD forms the initial bounding box of the line segment 
   * (i.e., the line segment if we were to do no joins).
   */
    var pts = [];
    var miterLimit, miterRatio, miterLength;
    
    var w1 = s1.lineWidth / this.scale;
    var p1 = pv.vector(s1.left, s1.top);
    var p2 = pv.vector(s2.left, s2.top);
    
    var p21 = p2.minus(p1);
    var v21 = p21.perp().norm();
    var w21 = v21.times(w1 / 2);
    
    var a = p1.plus (w21);
    var d = p1.minus(w21);
    
    var b = p2.plus (w21);
    var c = p2.minus(w21);
    
    // --------------------
    
    if(!s0 || !s0.visible){
        // Starting point
        pts.push(d, a);
    } else {
        var p0  = pv.vector(s0.left, s0.top);
        var p10 = p1.minus(p0);
        var v10 = p10.perp().norm(); // may point inwards or outwards
        
        // v1 points from p1 to the inner or outer corner.
        var v1 = v10.plus(v21).norm();
        
        // Miter Join
        // One is the outer corner, the other is the inner corner
        var am = this.lineIntersect(p1, v1, a, p21);
        var dm = this.lineIntersect(p1, v1, d, p21);
        
        // Check Miter Limit
        // The line width is taken as the average of the widths
        // of the p0-p1 segment and that of the p1-p2 segment.
        miterLength = am.minus(dm).length();
        var w0 = s0.lineWidth / this.scale;
        var w10avg = (w1 + w0) / 2;
        miterRatio = miterLength / w10avg;
        miterLimit = s1.strokeMiterLimit || pv.strokeMiterLimit;
        if(miterRatio <= miterLimit){
            // Accept the miter join
            pts.push(dm, am);
        } else {
            // Choose the bevel join
            // v1Outer is parallel to v1, but always points outwards
            var p12 = p21.times(-1);
            var v1Outer = p10.norm().plus(p12.norm()).norm();
            
            // The bevel intermediate point
            // Place it along v1Outer, at a distance w10avg/2 from p1.
            // If it were a circumference, it would have that radius.
            // The inner corner is am or dm.
            // The other corner is the original d or a.
            var bevel10 = p1.plus(v1Outer.times(w10avg / 2));
            if(v1Outer.dot(v21) >= 0){
                // a is outer, d is inner
                pts.push(dm, bevel10, a);
            } else {
                // d is outer, a is inner
                pts.push(d, bevel10, am);
            }
        }
    }
    
    // -------------------
    
    if(!s3 || !s3.visible){
        // Starting point
        pts.push(b, c);
    } else {
        var p3  = pv.vector(s3.left, s3.top);
        var p32 = p3.minus(p2);
        var v32 = p32.perp().norm();
        var v2  = v32.plus(v21).norm();
        
        // Miter Join
        var bm = this.lineIntersect(p2, v2, b, p21);
        var cm = this.lineIntersect(p2, v2, c, p21);
        
        miterLength = bm.minus(cm).length();
        var w3 = s3.lineWidth / this.scale;
        var w31avg = (w3 + w1) / 2;
        miterRatio = miterLength / w31avg;
        miterLimit = s2.strokeMiterLimit || pv.strokeMiterLimit;
        if(miterRatio <= miterLimit){
            // Accept the miter join
            pts.push(bm, cm);
        } else {
            // Choose a bevel join
            var p23 = p32.times(-1);
            var v2Outer = p21.norm().plus(p23.norm()).norm();
            var bevel31 = p2.plus(v2Outer.times(w31avg / 2));
            if(v2Outer.dot(v21) >= 0){
                // b is outer, c is inner
                pts.push(b, bevel31, cm);
            } else {
                // c is outer, b is inner
                pts.push(bm, bevel31, c);
            }
        }
    }
    
    // Render pts to svg path
    var pt = pts.shift();
    return "M" + pt.x + "," + pt.y + 
           "L" + pts.map(function(pt2){ return pt2.x + "," + pt2.y; })
                  .join(" ");
};

/** @private Line-line intersection, per Akenine-Moller 16.16.1. */
pv.SvgScene.lineIntersect = function(o1, d1, o2, d2) {
  return o1.plus(d1.times(o2.minus(o1).dot(d2.perp()) / d1.dot(d2.perp())));
};

/* Line & Area Commons */

pv.SvgScene.lineJoinPaths = function(paths, from, to) {
  // Curve-interpolated paths of each segment
  var d = paths[from].join(""); // Move And LineTo from the first step
  for (var i = from + 1 ; i <= to ; i++) {
    d += paths[i][1];  // LineTo of the following steps
  }
  
  return d;
};

/* Draws a single circle with a diameter equal to the line width, 
 * when neighbour scenes are invisible. 
 */
pv.SvgScene.lineAreaDotAlone = function(elm, scenes, i) {
  return elm;
  /*
  var s = scenes[i];
  var s2;
  if(i > 0){
    s2 = scenes[i-1];
    if(this.isSceneVisible(s2)){
      // Not alone
      return elm;
    }
  }
  
  var last = scenes.length - 1;
  if(i < last){
    s2 = scenes[i+1];
    if(this.isSceneVisible(s2)){
      // Not alone
      return elm;
    }
  }
  
  var style = s.strokeStyle;
  if(!style || !style.opacity){
    style = s.fillStyle;
  }
  var radius = Math.max(s.lineWidth  / 2, 1.5) / this.scale;
  
  var attrs = {
    'shape-rendering': s.antialias ? null : 'crispEdges',
    'pointer-events':  s.events,
    'cursor':          s.cursor,
    'fill':            style.color,
    'fill-opacity':    style.opacity || null,
    'stroke':          'none',
    'cx':              s.left,
    'cy':              s.top,
    'r':               radius
  };
  
  elm = this.expect(elm, "circle", scenes, i, attrs, s.css);
  
  if(s.svg) this.setAttributes(elm, s.svg);
  
  return this.append(elm, scenes, i);
  */
};

pv.Scene.eventsToNumber = {
  "":        0,
  "none":    0,
  "painted": 1,
  "all":     2
};

pv.Scene.numberToEvents = ["none", "painted", "all"];

pv.SvgScene.eachLineAreaSegment = function(elm, scenes, keyArgs, lineAreaSegment) {
  
  if(typeof keyArgs === 'function'){
    lineAreaSegment = keyArgs;
    keyArgs = null;
  }
  
  // Besides breaking paths on visible, 
  // should they break on properties as well?
  var breakOnKeyChange = pv.get(keyArgs, 'breakOnKeyChange', false);
  var from = pv.get(keyArgs, 'from') || 0;
  var to   = pv.get(keyArgs, 'to', scenes.length - 1);
  
  // The less restrictive events number from any of the instances:
  var eventsNumber;

  var ki, kf;
  if(breakOnKeyChange){
      ki = [];
      kf = [];
  }
  
  var i = from;
  while(i <= to){
    
    // Find the INITIAL scene
    var si = scenes[i];
    if(!this.isSceneVisible(si)){
      i++;
      continue;
    }
    
    eventsNumber = this.eventsToNumber[si.events] || 0;

    // Compute its line-area-key
    if(breakOnKeyChange){
      this.lineAreaSceneKey(si, ki);
    }
    
    // Find the FINAL scene
    // the "i" in which to start the next part
    var i2;
    var f = i;
    while(true){
      var f2 = f + 1;
      if(f2 > to){
        // No next scene
        // Connect i to f (possibly, i === f)
        // Continue with f + 1, to make it stop...
        i2 = f2;
        break;
      }
      
      var sf = scenes[f2];
      if(!this.isSceneVisible(sf)){  
        // f + 1 exists but is NOT strictly visible
        // Connect i to f (possibly, i === f)
        // Continue with f + 2
        i2 = f2 + 1;
        break;
      }
      
      eventsNumber = Math.max(eventsNumber, this.eventsToNumber[sf.events] || 0);
      
      // Accept f + 1 as final point
      // f > i
      f = f2;
      
      if(breakOnKeyChange){
        this.lineAreaSceneKey(sf, kf);
        if(!this.equalSceneKeys(ki, kf)){
          // Break path due to != path properties
          // Connect i to f
          // Continue with f
          i2 = f;
          break;
        }
      }
    }
  
    elm = lineAreaSegment.call(this, elm, scenes, i, f, keyArgs, this.numberToEvents[eventsNumber]);
    
    // next part
    i = i2;
  }
  
  return elm;
};

pv.SvgScene.lineAreaSceneKey = function(s, k) {
  k[0] = s.fillStyle.key;
  k[1] = s.strokeStyle.key;
  k[2] = s.lineWidth;
  k[3] = (s.strokeDasharray || 'none');
  k[4] = s.interpolate;
  return k;
};

pv.SvgScene.isSceneVisible = function(s) {
  return s.visible && (s.fillStyle.opacity > 0 || s.strokeStyle.opacity > 0);
};

pv.SvgScene.equalSceneKeys = function(ka, kb) {
  for(var i = 0, K = ka.length ; i < K ; i++) {
    if(ka[i] !== kb[i]) { return false; }
  }
  return true;
};
