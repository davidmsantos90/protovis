pv.SvgScene.minRuleLineWidth = 1;

pv.SvgScene.rule = function(scenes) {
  var e = scenes.$g.firstChild;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible) continue;
    var stroke = s.strokeStyle;
    if (!stroke.opacity) continue;

    var lineWidth = s.lineWidth;
    if(lineWidth < 1e-10){
        lineWidth = 0;
    } else {
        lineWidth = Math.max(this.minRuleLineWidth, lineWidth / this.scale);
    }
    
    e = this.expect(e, "line", scenes, i, {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events,
        "cursor": s.cursor,
        "x1": s.left,
        "y1": s.top,
        "x2": s.left + s.width,
        "y2": s.top + s.height,
        "stroke": stroke.color,
        "stroke-opacity": stroke.opacity,
        "stroke-width": lineWidth,
        "stroke-linecap":    s.lineCap,
        "stroke-dasharray":  stroke.opacity ? this.parseDasharray(s) : null
      });
    
    if(s.svg) this.setAttributes(e, s.svg);
    if(s.css) this.setStyle(e, s.css);

    e = this.append(e, scenes, i);
  }
  return e;
};
