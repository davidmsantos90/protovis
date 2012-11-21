pv.SvgScene.area = function(scenes) {
  var e = scenes.$g.firstChild;

  this.removeFillStyleDefinitions(scenes);

  var count = scenes.length;
  if (!count){
    return e;
  }
  
  var s = scenes[0];
  
  /* smart segmentation */
  if (s.segmented === 'smart') {
    return this.areaSegmentedSmart(e, scenes);
  }
  
  /* full segmented */
  if (s.segmented) {
    return this.areaSegmentedFull(e, scenes);
  }
  
  return this.areaFixed(e, scenes, 0, count - 1, /*addEvents*/ true);
};

pv.SvgScene.areaFixed = function(elm, scenes, from, to, addEvents) {
  var count = to - from + 1;
  
  // count > 0
  
  if(count === 1){
    return this.lineAreaDot(elm, scenes, from);
  }
  
  var s = scenes[from];
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
  
  var isInterpBasis      = false;
  var isInterpCardinal   = false;
  var isInterpMonotone   = false;
  var isInterpStepAfter  = false;
  var isInterpStepBefore = false;
  switch(s.interpolate){
    case 'basis':       isInterpBasis      = true; break;
    case 'cardinal':    isInterpCardinal   = true; break;
    case 'monotone':    isInterpMonotone   = true; break;
    case 'step-after':  isInterpStepAfter  = true; break;
    case 'step-before': isInterpStepBefore = true; break;
  }
  
  var isInterpBasisCardinalOrMonotone = isInterpBasis || isInterpCardinal || isInterpMonotone;
  
  /* points */
  var d = [], si, sj;
  for (var i = from ; i <= to ; i++) {
    si = scenes[i];
    if (!si.width && !si.height) {
      continue;
    }
    
    for (var j = i + 1; j <= to ; j++) {
      sj = scenes[j];
      if (!sj.width && !sj.height) {
        break;
      }
    }
    
    if ((i > from) && !isInterpStepAfter){ 
      i--;
    }
    
    if ((j <= to) && !isInterpStepBefore) {
      j++;
    }
    
    var fun = isInterpBasisCardinalOrMonotone && (j - i > 2) ? 
              this.areaPathCurve : 
              this.areaPathStraight;
    
    d.push( fun.call(this, scenes, i, j - 1, s) );
    i = j - 1;
  }
  
  if (!d.length) {
    return elm;
  }

  var sop = stroke.opacity;
  elm = this.expect(elm, "path", scenes, from, {
      "shape-rendering":   s.antialias ? null : "crispEdges",
      "pointer-events":    addEvents ? s.events : 'none',
      "cursor":            s.cursor,
      "d":                 "M" + d.join("ZM") + "Z",
      "fill":              fill.color,
      "fill-opacity":      fill.opacity || null,
      "stroke":            stroke.color,
      "stroke-opacity":    sop || null,
      "stroke-width":      sop ? (s.lineWidth / this.scale) : null,
      "stroke-linecap":    s.lineCap,
      "stroke-linejoin":   s.lineJoin,
      "stroke-miterlimit": s.strokeMiterLimit,
      "stroke-dasharray":  sop ? this.parseDasharray(s) : null
    });

  if(s.svg) this.setAttributes(elm, s.svg);
  if(s.css) this.setStyle(elm, s.css);

  return this.append(elm, scenes, from);
};

pv.SvgScene.areaSegmentedSmart = function(elm, scenes) {
  
  var eventsSegments = scenes.mark.$hasHandlers ? [] : null;
  
  /* Visual only */
  // Iterate *visible* scene segments
  elm = this.eachLineAreaSegment(elm, scenes, function(elm, scenes, from, to){
    
    // Paths depend only on visibility
    var segment = this.areaSegmentPaths(scenes, from, to);
    var pathsT = segment.top;
    var pathsB = segment.bottom;
    var fromp = from;
    
    // Events segments also, depend only on visibility
    if(eventsSegments){
      eventsSegments.push(segment);
    }
    
    // Split this visual scenes segment, 
    // on key properties changes
    var options = {
        breakOnKeyChange: true,
        from:  from,
        to:    to
      };
    
    return this.eachLineAreaSegment(elm, scenes, options, function(elm, scenes, from, to){
      
      var s1 = scenes[from];
      
      var fill   = s1.fillStyle;
      var stroke = s1.strokeStyle;
      
      this.addFillStyleDefinition(scenes, fill);
      this.addFillStyleDefinition(scenes, stroke);
      
      if(from === to){
        // Visual and events
        return this.lineAreaDotAlone(elm, scenes, from);
      }
      
      var d = this.areaJoinPaths(pathsT, pathsB, from - fromp, to - fromp - 1); // N - 1 paths connect N points

      var sop = stroke.opacity;
      var attrs = {
        'shape-rendering':   s1.antialias ? null : 'crispEdges',
        'pointer-events':    'none',
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
  
  /* Events */
  if(eventsSegments){
    eventsSegments.forEach(function(segment){
      var from  = segment.from;
      var pathsT = segment.top;
      var pathsB = segment.bottom;
      var P = pathsT.length;
      
      var attrsBase = {
          'shape-rendering': 'crispEdges',
          'fill':            'rgb(127,127,127)',
          'fill-opacity':    0.005, // VML requires this much to fire events
          'stroke':          null
        };
      
      pathsT.forEach(function(pathT, j){
        var i = from + j;
        var s = scenes[i];
        
        var events = s.events;
        if(events && events !== "none"){
          var pathB = pathsB[P - j - 1];
          
          var attrs = Object.create(attrsBase);
          attrs['pointer-events'] = events;
          attrs.cursor = s.cursor;
          attrs.d = pathT.join("") + "L" + pathB[0].substr(1) + pathB[1] + "Z";
          
          elm = this.expect(elm, 'path', scenes, i, attrs);
          
          elm = this.append(elm, scenes, i);
        }
      }, this); 
    }, this);
  }
  
  return elm;
};

pv.SvgScene.areaSegmentPaths = function(scenes, from, to) {
  return this.areaSegmentCurvePaths   (scenes, from, to) ||
         this.areaSegmentStraightPaths(scenes, from, to);
};

pv.SvgScene.areaSegmentCurvePaths = function(scenes, from, to){
  var count = to - from + 1;
  
  // count > 0
  
  var s = scenes[from];
  
  // Interpolated paths for scenes 0 to count-1
  var isBasis    = s.interpolate === "basis";
  var isCardinal = !isBasis && s.interpolate === "cardinal";
  if (isBasis || isCardinal || s.interpolate == "monotone") {
    var pointsT = [];
    var pointsB = [];
    for (var i = 0 ; i < count ; i++) {
      var si = scenes[from + i]; // from -> to
      var sj = scenes[to   - i]; // to -> from
      
      pointsT.push(si);
      pointsB.push({left: sj.left + sj.width, top: sj.top + sj.height});
    }
    
    var pathsT, pathsB;
    if (isBasis) {
      pathsT = this.curveBasisSegments(pointsT);
      pathsB = this.curveBasisSegments(pointsB);
    } else if (isCardinal) {
      pathsT = this.curveCardinalSegments(pointsT, s.tension);
      pathsB = this.curveCardinalSegments(pointsB, s.tension);
    } else { // monotone
      pathsT = this.curveMonotoneSegments(pointsT);
      pathsB = this.curveMonotoneSegments(pointsB);
    }
    
    if(pathsT || pathsT.length){
      return {
        from:   from,
        top:    pathsT, 
        bottom: pathsB
      };
    }
  }
};

/** @private Computes the straight path for the range [i, j]. */
pv.SvgScene.areaSegmentStraightPaths = function(scenes, i, j){
  var pathsT = [];
  var pathsB = [];
  
  for (var k = j, m = i ; i < k ; i++, j--) {
    // i - top    line index, from i to j
    // j - bottom line index, from j to i
    var si = scenes[i],
        sj = scenes[j],
        pi = ['M' + si.left + "," + si.top],
        pj = ['M' + (sj.left + sj.width) + "," + (sj.top + sj.height)];

    /* interpolate */
    var sk = scenes[i + 1], // top    line
        sl = scenes[j - 1]; // bottom line
    switch(si.interpolate){
      case 'step-before':
        pi.push("V" + sk.top + "H" + sk.left);
        //pj.push("H" + (sl.left + sl.width));
        break;
      
      case 'step-after':
        pi.push("H" + sk.left + "V" + sk.top);
        //pj.push("V" + (sl.top + sl.height));
        break;
        
     default: // linear
       pi.push("L" +  sk.left + "," + sk.top);
    }
    
    pj.push("L" + (sl.left + sl.width) + "," + (sl.top + sl.height));
    
    pathsT.push(pi);
    pathsB.push(pj);
  }
  
  return {
    from:   m,
    top:    pathsT, 
    bottom: pathsB
  };
};

pv.SvgScene.areaJoinPaths = function(pathsT, pathsB, i, j){
  /*             
   *  Scenes ->  0 ...             N-1
   *  pathsT ->  0 1 2 3 4 5 6 7 8 9
   *             9 8 7 6 5 4 3 2 1 0 <- pathsB
   *                   |   |
   *                   i<->j
   *                   
   */
  var fullPathT = "";
  var fullPathB = "";
  
  var N = pathsT.length;
  
  for (var k = i, l = N - 1 - j ; k <= j ; k++, l++) {
    var pathT = pathsT[k];
    var pathB = pathsB[l];
    
    var dT;
    var dB;
    if(k === i){
      // Add moveTo and lineTo of first (top) part
      dT = pathT.join("");
      
      // Join top and bottom parts with a line to the bottom right point
      dB = "L" + pathB[0].substr(1) + pathB[1]; 
    } else {
      // Add lineTo only, on following parts
      dT = pathT[1];
      dB = pathB[1];
    }
    
    fullPathT += dT;
    fullPathB += dB;
  }
  
  // Close the path with Z
  return fullPathT + fullPathB + "Z";
};

pv.SvgScene.areaSegmentedFull = function(e, scenes) {
  // Curve interpolations paths for each scene
  var count = scenes.length;
  
  var pathsT, pathsB;
  var result = this.areaSegmentCurvePaths(scenes, 0, count - 1);
  if(result){
    pathsT = result.top;
    pathsB = result.bottom;
  }
  
  // -------------
  
  var s = scenes[0];
  for (var i = 0 ; i < count - 1 ; i++) {
    var s1 = scenes[i];
    var s2 = scenes[i + 1];
    
    /* visible */
    if (!s1.visible || !s2.visible) {
      continue;
    }
    
    var fill   = s1.fillStyle;
    var stroke = s1.strokeStyle;
    if (!fill.opacity && !stroke.opacity) {
      continue;
    }
    
    var d;
    if (pathsT) {
      var pathT = pathsT[i].join(""),
          pathB = "L" + pathsB[count - i - 2].join("").substr(1);

      d = pathT + pathB + "Z";
    } else {
      /* interpolate */
      var si = s1;
      var sj = s2;
      switch (s1.interpolate) {
        case "step-before": si = s2; break;
        case "step-after":  sj = s1; break;
      }

      /* path */
      d = "M" + s1.left + "," + si.top
        + "L" + s2.left + "," + sj.top
        + "L" + (s2.left + s2.width) + "," + (sj.top + sj.height)
        + "L" + (s1.left + s1.width) + "," + (si.top + si.height)
        + "Z";
    }

    var attrs = {
        "shape-rendering": s1.antialias ? null : "crispEdges",
        "pointer-events":  s1.events,
        "cursor":          s1.cursor,
        "d":               d,
        "fill":            fill.color,
        "fill-opacity":    fill.opacity || null,
        "stroke":          stroke.color,
        "stroke-opacity":  stroke.opacity || null,
        "stroke-width":    stroke.opacity ? s1.lineWidth / this.scale : null
      };
    
    e = this.expect(e, "path", scenes, i, attrs);

    if(s1.svg) this.setAttributes(e, s1.svg);
    if(s1.css) this.setStyle(e, s1.css);

    e = this.append(e, scenes, i);
  }
  return e;
};


/** @private Computes the straight path for the range [i, j]. */
pv.SvgScene.areaPathStraight = function(scenes, i, j, s){
  var pointsT = [];
  var pointsB = [];
  
  for (var k = j ; i <= k ; i++, j--) {
    // i - top    line index, from i to j
    // j - bottom line index, from j to i
    var si = scenes[i],
        sj = scenes[j],
        pi = si.left + "," + si.top,
        pj = (sj.left + sj.width) + "," + (sj.top + sj.height);

    /* interpolate */
    if (i < k) {
      var sk = scenes[i + 1], // top    line 
          sl = scenes[j - 1]; // bottom line
      switch(s.interpolate){
        case 'step-before':
          pi += "V" + sk.top;
          pj += "H" + (sl.left + sl.width);
          break;
        case 'step-after':
          pi += "H" + sk.left;
          pj += "V" + (sl.top + sl.height);
          break;
      }
    }

    pointsT.push(pi);
    pointsB.push(pj);
  }
  
  return pointsT.concat(pointsB).join("L");
};

/** @private Computes the curved path for the range [i, j]. */
pv.SvgScene.areaPathCurve = function(scenes, i, j, s){
  var pointsT = [];
  var pointsB = []; 
  var pathT, pathB;

  for (var k = j; i <= k; i++, j--) {
    var sj = scenes[j];
    pointsT.push(scenes[i]);
    pointsB.push({left: sj.left + sj.width, top: sj.top + sj.height});
  }
  
  switch(s.interpolate){
    case 'basis':
      pathT = this.curveBasis(pointsT);
      pathB = this.curveBasis(pointsB);
      break;
      
    case 'cardinal':
      pathT = this.curveCardinal(pointsT, s.tension);
      pathB = this.curveCardinal(pointsB, s.tension);
      break;
      
    default: // monotone
      pathT  = this.curveMonotone(pointsT);
      pathB = this.curveMonotone(pointsB);
  }

  return pointsT[0].left + "," + pointsT[0].top + 
         pathT + 
         "L" + 
         pointsB[0].left + "," + pointsB[0].top + 
         pathB;
};
