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
      svg.d = this.renderSymbol(shape, s);
      shape = 'path';

      t = 'translate(' + s.left + ',' + s.top + ') ';
      if(sa) { t += 'rotate(' + pv.degrees(sa) + ') '; }

      if(ar !== 1) {
        var sy =  1 / Math.sqrt(ar);
        var sx = ar * sy;

        t += 'scale(' + sx + ',' + sy + ')';
      }
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

  S.renderSymbol = function(symName, instance) {
    return _renderersBySymName[symName].call(S, instance, symName);
  };

  S.hasSymbol = function(symName) {
    return _renderersBySymName.hasOwnProperty(symName);
  };

  S.symbols = function() {
    return pv.keys(_renderersBySymName);
  };

  var C1 = 2 / Math.sqrt(3);

  S
  .registerSymbol('circle', function(s) {
    throw new Error("Not implemented as a symbol");
  })
  .registerSymbol('cross', function(s) {
    var rp = s.shapeRadius,
        rn = -rp;

    return "M" + rn + "," + rn + "L" + rp + "," + rp + 
           "M" + rp + "," + rn + "L" + rn + "," + rp;
  })
  .registerSymbol('triangle', function(s) {
    var hp = s.shapeRadius,
        wp = hp * C1,
        hn = -hp,
        wn = -wp;

    return "M0," + hp + "L" + wp + "," + hn + " " + wn + "," + hn + "Z";
  })
  .registerSymbol('diamond', function(s) {
    var rp = s.shapeRadius * Math.SQRT2,
        rn = -rp;

    return "M0,"      + rn   + 
           "L" + rp   + ",0" + 
           " " + "0," + rp   + 
           " " + rn   + ",0" + 
           "Z";
  })
  .registerSymbol('square', function(s) {
    var rp = s.shapeRadius,
        rn = -rp;

    return "M" + rn + "," + rn + 
           "L" + rp + "," + rn +
           " " + rp + "," + rp +
           " " + rn + "," + rp +
           "Z";
  })
  .registerSymbol('tick', function(s) {
    return "M0,0L0," + -s.shapeSize;
  })
  .registerSymbol('bar', function(s) {
    var z2 = s.shapeSize / 2;
    return "M0," + z2 + "L0," + -z2;
  });

}(pv.SvgScene));
