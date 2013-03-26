pv.SvgScene.minBarWidth = 1;
pv.SvgScene.minBarHeight = 1;
pv.SvgScene.minBarLineWidth = 0.2;

pv.SvgScene.bar = function(scenes) {
  var e = scenes.$g.firstChild;

  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible || Math.abs(s.width) <= 1E-10 || Math.abs(s.height) <= 1E-10) continue;
    if(s.width < this.minBarWidth){
        s.width = this.minBarWidth;
    }
    
    if(s.height < this.minBarHeight){
        s.height = this.minBarHeight;
    }
    
    var fill = s.fillStyle, stroke = s.strokeStyle;
    if (!fill.opacity && !stroke.opacity) continue;

    this.addFillStyleDefinition(scenes, fill);
    this.addFillStyleDefinition(scenes, stroke);
    
    var lineWidth;
    if(stroke.opacity){
        lineWidth = s.lineWidth;
        if(lineWidth < 1e-10){
            lineWidth = 0;
        } else {
            lineWidth = Math.max(this.minBarLineWidth, lineWidth / this.scale);
        }
    } else {
        lineWidth = null;
    }
    
    e = this.expect(e, "rect", scenes, i, {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events,
        "cursor": s.cursor,
        "x": s.left,
        "y": s.top,
        "width": Math.max(1E-10, s.width),
        "height": Math.max(1E-10, s.height),
        "fill": fill.color,
        "fill-opacity": fill.opacity || null,
        "stroke": stroke.color,
        "stroke-opacity": stroke.opacity || null,
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
