pv.SvgScene.dot = function(scenes) {
  var e = scenes.$g.firstChild;
  
  for(var i = 0, L = scenes.length ; i < L ; i++) {
    var s = scenes[i];

    /* visible */
    if(!s.visible) continue;

    var fill     = s.fillStyle, 
        fillOp   = fill.opacity,
        stroke   = s.strokeStyle,
        strokeOp = stroke.opacity;

    if(!fillOp && !strokeOp) continue;

    this.addFillStyleDefinition(scenes, fill  );
    this.addFillStyleDefinition(scenes, stroke);

    var svg = {
      "shape-rendering":  s.antialias ? null : "crispEdges",
      "pointer-events":   s.events,
      "cursor":           s.cursor,
      "fill":             fill.color,
      "fill-opacity":     fillOp   || null,
      "stroke":           stroke.color,
      "stroke-opacity":   strokeOp || null,
      "stroke-width":     strokeOp ? (s.lineWidth / this.scale) : null,
      "stroke-linecap":   s.lineCap,
      "stroke-dasharray": strokeOp ? this.parseDasharray(s) : null
    };

    // Use <circle> for circles, <path> for everything else.
    var shape = s.shape || 'circle';
    var ar = s.aspectRatio;
    var sa = s.shapeAngle;
    var t  = null; // must reset to null, in every iteration. Declaring the var is not sufficient.
    if(shape === 'circle') {
      if(ar === 1) {
        svg.cx = s.left;
        svg.cy = s.top;
        svg.r  = s.shapeRadius;
      } else {
        shape = 'ellipse';

        svg.cx = svg.cy = 0;
        
        t = 'translate(' + s.left + ',' + s.top + ') ';
        if(sa) { t += 'rotate(' + pv.degrees(sa) + ') '; }

        svg.rx = s._width  / 2;
        svg.ry = s._height / 2;
      }
    } else {
      var r = s.shapeRadius, rx = r, ry = r;
      if(ar > 0 && ar !== 1) {
        // Make it so that the original area is maintained, and the desired aspect ratio results.
        // ar = rx / ry
        // Size_after = rx*ry = Size_before = r*r
        var sy = 1 / Math.sqrt(ar);
        var sx = ar * sy;
        
        rx *= sx;
        ry *= sy;
        // doing this way would have the disadvantage of altering the border width...
        // t += 'scale(' + sx + ',' + sy + ')';
      }

      svg.d = this.renderSymbol(shape, s, rx, ry);
      shape = 'path';

      t = 'translate(' + s.left + ',' + s.top + ') ';
      if(sa) { t += 'rotate(' + pv.degrees(sa) + ') '; }
    }

    if(t) { svg.transform = t; }

    e = this.expect(e, shape, scenes, i, svg);

    if(s.svg) { this.setAttributes(e, s.svg); }
    if(s.css) { this.setStyle     (e, s.css); }

    e = this.append(e, scenes, i);
  }

  return e;
};

(function(S) {
  var _renderersBySymName = {};

  // NOTE: circle has special render treatment
  // Only path-generating shapes are registered this way

  S.registerSymbol = function(symName, funRenderer) {
    _renderersBySymName[symName] = funRenderer;
    return S;
  };

  S.renderSymbol = function(symName, instance, rx, ry) {
    return _renderersBySymName[symName].call(S, instance, symName, rx, ry);
  };

  S.hasSymbol = function(symName) {
    return _renderersBySymName.hasOwnProperty(symName);
  };

  S.symbols = function() {
    return pv.keys(_renderersBySymName);
  };

  var C1 = 2 / Math.sqrt(3); // ~1.1547

  S
  .registerSymbol('circle', function(s) {
    throw new Error("Not implemented as a symbol");
  })
  .registerSymbol('cross', function(s, name, rx, ry) {
    var rp = s.shapeRadius,
        rxn = -rx, ryn = -ry,
        rn  = -rp;

    return "M" + rxn + "," + ryn + "L" + rx  + "," + ry + 
           "M" + rx  + "," + ryn + "L" + rxn + "," + ry;
  })
  .registerSymbol('triangle', function(s, name, rx, ry) {
    var hp = ry,
        wp = rx * C1,
        hn = -ry,
        wn = -wp;

    return "M0," + hp + "L" + wp + "," + hn + " " + wn + "," + hn + "Z";
  })
  .registerSymbol('diamond', function(s, name, rx, ry) {
    var rxp = rx * Math.SQRT2,
        ryp = ry * Math.SQRT2,
        rxn = -rxp,
        ryn = -ryp;

    return "M0,"      + ryn  + 
           "L" + rxp  + ",0" + 
           " " + "0," + ryp  + 
           " " + rxn  + ",0" + 
           "Z";
  })
  .registerSymbol('square', function(s, name, rx, ry) {
     var rxn = -rx,
         ryn = -ry;

    return "M" + rxn + "," + ryn + 
           "L" + rx  + "," + ryn +
           " " + rx  + "," + ry  +
           " " + rxn + "," + ry  +
           "Z";
  })
  .registerSymbol('tick', function(s, name, rx, ry) {
    var ry2 = -ry*ry;
    return "M0,0L0," + ry2;
  })
  .registerSymbol('bar', function(s, name, rx, ry) {
    var z2 = (ry * ry) / 2;
    return "M0," + z2 + "L0," + -z2;
  });

}(pv.SvgScene));
