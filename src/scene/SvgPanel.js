/* The following applies generally only to non-root panels.
* See below for more info on root panels.
 *
 * With clipping:
 * <g> scenes.$g -> g
 *     group for panel content
 *
 *     instance 0
 *     <g clip-path="url(#123)"> -> c -> g -> scenes.$g
 *        <clipPath id="123"> -> e
 *            <rect x="s.left" y="s.top" width="s.width" height="s.height" />
 *        </clipPath>
 *        <rect fill="" /> -> e
 *        <g>child 0 - childScenes $g</g>
 *        <g>child 1 - childScenes.$g</g>
 *        ...
 *        <rect stroke="" /> -> e
 *
 *        restore initial group
 *        scenes.$g <- g <- c.parentNode,
 *     </g>
 *
 *     instance 1
 *     
 * </g>
 *
 * Without clipping:
 * <g> -> g
 *     group for panel content
 *
 *     instance 0
 *     <rect fill="" /> -> e
 *     <g>child 0</g>
 *     <g>child 1</g>
 *     ...
 *     <rect stroke="" /> -> e
 *     
 *     instance 1
 *     <rect fill="" />
 *     ...
 * </g>
 */
pv.SvgScene.panel = function(scenes) {
  // scenes.$g is the default parent of elements appended in the context of
  // this `scenes` instance (see pv.SvgScene.append).
  // 
  // When clipping is used, a different clipping container is used per panel instance, 
  //  and scenes.$g will have one child "g" element per panel instance, 
  //  that itself is a container for child marks' rendered content.
  // When clipping is not used, there's no real need to separate content from 
  //  different panel instances (although explicit zOrder may result quite differently...),
  //  and so, scenes.$g will be the parent of every instance's content.
  // 
  // On the first render, scenes.$g is undefined.
  // Otherwise, holds the default parent left there from the previous render.
  // 
  // On ROOT PANELS, it is quite more elaborate...
  // 
  // Each root panel instance has an associated canvas element (usually shared by all).
  // The canvas is generally not an svg namespaced element.
  // It is the intended container for the root svg:svg element of 
  //  each root panel instance.
  // 
  // Sharing canvases, results in:
  //   <div>           = scenes[0,2,3].canvas
  //      <svg ... />  = g <-> scenes[0]
  //      <svg ... />  = g <-> scenes[2]
  //      <svg ... />  = g <-> scenes[3]
  //   </div>
  // 
  // and in some other div:
  //   <div>           = scenes[1,4].canvas
  //      <svg ... />  = g <-> scenes[1]
  //      <svg ... />  = g <-> scenes[4]
  //   </div>
  //   
  // Unspecified canvases (auto/ created):
  //   <span>         = scenes[0].canvas
  //     <svg ... />  = g <-> scenes[0]
  //   </span>
  //   <span>         = scenes[1].canvas
  //     <svg ... />  = g <-> scenes[1]
  //   </span>
  //   <span>         = scenes[2].canvas
  //     <svg ... />  = g <-> scenes[2]
  //   </span>
  //
  var g = scenes.$g;
  var e = g && g.firstChild; // !g => !e
  var pendingAppendRootElems;
  for(var i = 0, L = scenes.length ; i < L ; i++) {
    var s = scenes[i];
    
    if(!s.visible) { continue; }

    // Root panel
    if(!scenes.parent) {
      // s.canvas != null cause pv.Panel#buildImplied creates one when undefined.
      var canvas = s.canvas;

      // TODO: Any way to do this only once per render and canvas element?
      this.applyCanvasStyle(canvas);

      // First render and First visible instance
      // => !g => !e and **not enter this if**
      // ----
      // !First render => g
      //  * i is the first visible instance _and_ g is the previous' render last scenes.$g set.
      //    if only one instance, g will probably be ok, 
      //    otherwise...we just pick the probable old g.
      //    OR
      //  * g is previous instance's _refreshed_ svg element,
      //    and this instance might have a different canvas.
      // ----

      // Active canvas changed?
      if(g && (g.parentNode !== canvas)) { // TODO: batik may not work with ===
        g = canvas.firstChild; // can be null
        e = g && g.firstChild; // !g ==> !e
      }
      // TODO: Can't understand how g is not always set to the corresponding instance's svg...
      // How this is being done, this seems to work on the first render, but not for non-first instances of later renders.
      
      if(!g) { // => !e
        g = this.createRootPanelElement(); // factory of svg/whatever element
        e = null; // J.I.C.?

        this.initRootPanelElement(g, scenes.mark);
        if(!pendingAppendRootElems) { pendingAppendRootElems = []; }
        pendingAppendRootElems.push([canvas, g]);

        //canvas.appendChild(g);
        // canvas.firstChild === g ? Not necessarily!
        // g.parentNode === canvas ? Yes sure!

        // Create the global defs element (whether or not it is actually used).
        scenes.$defs = g.appendChild(this.create("defs"));

        // Set g as the current default parent.
        // TODO: Shouldn't this be done every time that g changes during the loop?
        scenes.$g = g;

        // <div>    -> scenes[i].canvas
        //   .. ? ..   (other instances <svg /> elements may already exist here)
        //   <svg>  -> g, scenes.$g <-> scenes[i] 
        //     <defs/>
        
      } else if(e && e.tagName === 'defs') {
        e = e.nextSibling;
      }

      g.setAttribute("width",  s.width  + s.left + s.right );
      g.setAttribute("height", s.height + s.top  + s.bottom);
    }

    // clip (nest children)
    var clip_g = null;
    if(s.overflow === "hidden") {
      var clipResult = this.addPanelClipPath(g, e, scenes, i, s);
      clip_g = clipResult.g;

      // clip_g.parentNode holds the initial g at scenes.$g.
      // And so we have a way to recover it later!
      // Make clip_g the current default parent of appended nodes.
      scenes.$g = g = clip_g;
      e = clipResult.next;
    }
    
    // fill rect
    e = this.fill(e, scenes, i);

    // transform (push)
    var k = this.scale,
        t = s.transform,
        x = s.left + t.x,
        y = s.top  + t.y;
    this.scale *= t.k;

    // children
    if(s.children.length) {
        var attrs = {
            "transform": "translate(" + x + "," + y + ")" +
                         (t.k != 1 ? " scale(" + t.k + ")" : "")
        };
        
        this.eachChild(scenes, i, function(childScenes) {
            childScenes.$g = e = this.expect(e, "g", scenes, i, attrs);

            this.updateAll(childScenes);
            if(!e.parentNode) { g.appendChild(e) };
            e = e.nextSibling;
        });
    }

    // transform (pop)
    this.scale = k;

    // stroke rect
    e = this.stroke(e, scenes, i);
    
    // clip (restore group)
    if(clip_g) {
      // restore initial g, from clip_g
      scenes.$g = g = clip_g.parentNode; // g != null !
      e = clip_g.nextSibling;
    }
  } // end for panel instance
  
  // Defer appending to canvas when fully built.
  if(pendingAppendRootElems) {
    pendingAppendRootElems.forEach(function(cg) {
      cg[0].appendChild(cg[1]);
    })
  }

  return e;
};

pv.SvgScene.applyCanvasStyle = function(canvas) {
  // TODO: Is "inline-block" because a canvas can be placed inline with text?
  canvas.style.display = "inline-block";
};

pv.SvgScene.createRootPanelElement = function() {
  return this.create("svg");
};

pv.SvgScene.initRootPanelElement = function(g, panel) {
  // Only runs when the panel is created by createRootPanelElement.
  // Default values for attributes, inherited by descendant svg:* elements.
  g.setAttribute("font-size",    "10px");
  g.setAttribute("font-family",  "sans-serif");
  g.setAttribute("fill",         "none");
  g.setAttribute("stroke",       "none");
  g.setAttribute("stroke-width", 1.5);
  
  this.disableElementSelection(g);

  this.listenRootPanelElement(g, panel);
};

pv.SvgScene.listenRootPanelElement = function(g, panel) {
  for(var j = 0, evs = this.events, J = evs.length ; j < J ; j++) {
    g.addEventListener(evs[j], this.dispatch, false);

    panel._registerBoundEvent(g, evs[j], this.dispatch, false);
  }
};

pv.SvgScene.disableElementSelection = function(g) {
  // Prevent selecting elements when dragging
  
  // TODO: last time I tested, not working for IE10 or IE9...

  // Supported by IE10 SVG
  g.setAttribute("style", "-webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;");

  if(typeof g.onselectstart !== 'undefined') { // TODO: really strange test...
      // IE9 SVG
      g.setAttribute('unselectable', 'on');
      g.onselectstart = function() { return false; };
  }
};

pv.SvgScene.addPanelClipPath = function(g, e, scenes, i, s) {
  // <g clip-path="url(#ID)">  // clip-g
  //    <clipPath id="ID">     // e
  //        <rect x="s.left" y="s.top" width="s.width" height="s.height" />  // r
  //    </clipPath>
  //    e <= next insertion/replace point
  // </g>

  // An ID for the clipping path element
  var id = pv.id().toString(36);

  // The clipping group
  var clip_g = this.expect(e, "g", scenes, i, {"clip-path": "url(#" + id + ")"});
  
  // The clipping path
  var clip_p = this.expect(clip_g.firstChild, "clipPath", scenes, i, {"id": id});
  
  // The clipping rect
  var r = clip_p.firstChild || clip_p.appendChild(this.create("rect"));
  r.setAttribute("x",      s.left);
  r.setAttribute("y",      s.top);
  r.setAttribute("width",  s.width);
  r.setAttribute("height", s.height);

  // Ensure connected
  if(!clip_p.parentNode) { clip_g.appendChild(clip_p); }
  if(!clip_g.parentNode) { g.appendChild(clip_g); }
  
  return {g: clip_g, next: clip_p.nextSibling};
};

pv.SvgScene.eachChild = function(scenes, i, fun, ctx){
  if(scenes.mark._zOrderChildCount){
    var sorted = scenes[i].children.slice(0);
    sorted.sort(function(scenes1, scenes2){ // sort ascending
      var compare = scenes1.mark._zOrder - scenes2.mark._zOrder;
      if(compare === 0){
          // Preserve original order for same zOrder childs
          compare = scenes1.childIndex - scenes2.childIndex;
      }
      return compare;
    });
    
    sorted.forEach(fun, ctx || this);
  } else {
    scenes[i].children.forEach(fun, ctx || this);
  }
};

pv.SvgScene.fill = function(e, scenes, i) {
  var s = scenes[i], fill = s.fillStyle;
  if (fill.opacity || s.events == "all") {
    this.addFillStyleDefinition(scenes, fill);

    e = this.expect(e, "rect", scenes, i, {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events,
        "cursor": s.cursor,
        "x": s.left,
        "y": s.top,
        "width":  s.width,
        "height": s.height,
        "fill": fill.color,
        "fill-opacity": fill.opacity,
        "stroke": null
      });
    e = this.append(e, scenes, i);
  }
  return e;
};

pv.SvgScene.stroke = function(e, scenes, i) {
  var s = scenes[i], stroke = s.strokeStyle;
  if (stroke.opacity || s.events == "all") {
    e = this.expect(e, "rect", scenes, i, {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events == "all" ? "stroke" : s.events,
        "cursor": s.cursor,
        "x": s.left,
        "y": s.top,
        "width": Math.max(1E-10, s.width),
        "height": Math.max(1E-10, s.height),
        "fill": null,
        "stroke": stroke.color,
        "stroke-opacity": stroke.opacity,
        "stroke-width": s.lineWidth / this.scale,
        "stroke-linecap":    s.lineCap,
        "stroke-dasharray":  stroke.opacity ? this.parseDasharray(s) : null
      });
    e = this.append(e, scenes, i);
  }
  return e;
};
