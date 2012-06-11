pv.SvgScene.line = function(scenes) {
  var e = scenes.$g.firstChild;
  if (scenes.length < 2) return e;
  var s = scenes[0];

  /* segmented */
  if (s.segmented) return this.lineSegment(scenes);

  /* visible */
  if (!s.visible) return e;
  var fill = s.fillStyle, stroke = s.strokeStyle;
  if (!fill.opacity && !stroke.opacity) return e;

  /* points */
  var d = "M" + s.left + "," + s.top;

  if (scenes.length > 2 && (s.interpolate == "basis" || s.interpolate == "cardinal" || s.interpolate == "monotone")) {
    switch (s.interpolate) {
      case "basis": d += this.curveBasis(scenes); break;
      case "cardinal": d += this.curveCardinal(scenes, s.tension); break;
      case "monotone": d += this.curveMonotone(scenes); break;
    }
  } else {
    for (var i = 1; i < scenes.length; i++) {
      d += this.pathSegment(scenes[i - 1], scenes[i]);
    }
  }

  e = this.expect(e, "path", {
      "shape-rendering": s.antialias ? null : "crispEdges",
      "pointer-events": s.events,
      "cursor": s.cursor,
      "d": d,
      "fill": fill.color,
      "fill-opacity": fill.opacity || null,
      "stroke": stroke.color,
      "stroke-opacity": stroke.opacity || null,
      "stroke-width": stroke.opacity ? s.lineWidth / this.scale : null,
      "stroke-linejoin": s.lineJoin,
      "stroke-dasharray": s.strokeDasharray || 'none'
    });

  if(s.svg) this.setAttributes(e, s.svg);
  if(s.css) this.setStyle(e, s.css);

  return this.append(e, scenes, 0);
};

pv.SvgScene.lineSegment = function(scenes) {
  var e = scenes.$g.firstChild;

  var s = scenes[0];
  var paths;
  switch (s.interpolate) {
    case "basis": paths = this.curveBasisSegments(scenes); break;
    case "cardinal": paths = this.curveCardinalSegments(scenes, s.tension); break;
    case "monotone": paths = this.curveMonotoneSegments(scenes); break;
  }

  for (var i = 0, n = scenes.length - 1; i < n; i++) {
    var s1 = scenes[i], s2 = scenes[i + 1];

    /* visible */
    if (!s1.visible || !s2.visible) continue;
    var stroke = s1.strokeStyle, fill = pv.Color.transparent;
    if (!stroke.opacity) continue;

    /* interpolate */
    var d;
    if ((s1.interpolate == "linear") && (s1.lineJoin == "miter")) {
      fill = stroke;
      stroke = pv.Color.transparent;
      d = this.pathJoin(scenes[i - 1], s1, s2, scenes[i + 2]);
    } else if(paths) {
      d = paths[i];
    } else {
      d = "M" + s1.left + "," + s1.top + this.pathSegment(s1, s2);
    }

    e = this.expect(e, "path", {
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
pv.SvgScene.pathSegment = function(s1, s2) {
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
    case "step-after": return "H" + s2.left + "V" + s2.top;
  }
  return "L" + s2.left + "," + s2.top;
};

/** @private Line-line intersection, per Akenine-Moller 16.16.1. */
pv.SvgScene.lineIntersect = function(o1, d1, o2, d2) {
  return o1.plus(d1.times(o2.minus(o1).dot(d2.perp()) / d1.dot(d2.perp())));
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
  perp() corresponds to rotating 90º clockwise.
  
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
