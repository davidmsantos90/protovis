/**
 * @private
 * @namespace
 */
pv.Scene = pv.SvgScene = {
  /* Various namespaces. */
  svg: "http://www.w3.org/2000/svg",
  xmlns: "http://www.w3.org/2000/xmlns",
  xlink: "http://www.w3.org/1999/xlink",
  xhtml: "http://www.w3.org/1999/xhtml",

  /** The pre-multipled scale, based on any enclosing transforms. */
  scale: 1,

  /** The set of supported events. */
  events: [
    "DOMMouseScroll", // for Firefox
    "mousewheel",
    "mousedown",
    "mouseup",
    "mouseover",
    "mouseout",
    "mousemove",
    "click",
    "dblclick"
  ],

  /** Implicit values for SVG and CSS properties. */
  implicit: {
    svg: {
      "shape-rendering": "auto",
      "pointer-events": "painted",
      "x": 0,
      "y": 0,
      "dy": 0,
      "text-anchor": "start",
      "transform": "translate(0,0)",
      "fill": "none",
      "fill-opacity": 1,
      "stroke": "none",
      "stroke-opacity": 1,
      "stroke-width": 1.5,
      "stroke-linejoin": "miter"
    },
    css: {
      "font": "10px sans-serif"
    }
  }
};

/**
 * Updates the display for the specified array of scene nodes.
 *
 * @param scenes {array} an array of scene nodes.
 */
pv.SvgScene.updateAll = function(scenes) {
  if (scenes.length
      && scenes[0].reverse
      && (scenes.type != "line")
      && (scenes.type != "area")) {
    var reversed = pv.extend(scenes);
    for (var i = 0, j = scenes.length - 1; j >= 0; i++, j--) {
      reversed[i] = scenes[j];
    }
    scenes = reversed;
  }
  this.removeSiblings(this[scenes.type](scenes));
};

/**
 * Creates a new SVG element of the specified type.
 *
 * @param type {string} an SVG element type, such as "rect".
 * @returns a new SVG element.
 */
pv.SvgScene.create = function(type) {
  return document.createElementNS(this.svg, type);
};

/**
 * Expects the element <i>e</i> to be the specified type. If the element does
 * not exist, a new one is created. If the element does exist but is the wrong
 * type, it is replaced with the specified element.
 *
 * @param e the current SVG element.
 * @param type {string} an SVG element type, such as "rect".
 * @param attributes an optional attribute map.
 * @param style an optional style map.
 * @returns a new SVG element.
 */
pv.SvgScene.expect = function(e, type, scenes, i, attributes, style) {
  if (e) {
    if (e.tagName === "defs") e = e.nextSibling;
    if (e.tagName === "a") e = e.firstChild;
    if (e.tagName !== type) {
      var n = this.create(type);
      e.parentNode.replaceChild(n, e);
      e = n;
    }
  } else {
    e = this.create(type);
  }

  if(attributes) this.setAttributes(e, attributes);
  if(style)      this.setStyle(e, style);

  return e;
};

pv.SvgScene.setAttributes = function(e, attributes){
    for (var name in attributes) {
        var value = attributes[name];
        if (value == this.implicit.svg[name]) value = null;
        if (value == null) e.removeAttribute(name);
        else e.setAttribute(name, value);
    }
};

pv.SvgScene.setStyle = function(e, style){
  for (var name in style) {
    var value = style[name];
    if (value == this.implicit.css[name]) value = null;
    if (value == null) {
      if (pv.renderer() === "batik") {
        e.removeAttribute(name);
      } else if (pv.renderer() != 'svgweb') // svgweb doesn't support removeproperty TODO SVGWEB
        e.style.removeProperty(name);
    }
    else if (pv.renderer() == "batik")
      e.style.setProperty(name,value);
    else
      e.style[name] = value;
  }
};

/** TODO */
pv.SvgScene.append = function(e, scenes, index) {
  e.$scene = {scenes:scenes, index:index};
  e = this.title(e, scenes[index]);
  if (!e.parentNode) scenes.$g.appendChild(e);
  return e.nextSibling;
};

/**
 * Applies a title tooltip to the specified element <tt>e</tt>, using the
 * <tt>title</tt> property of the specified scene node <tt>s</tt>. Note that
 * this implementation creates both the SVG <tt>title</tt> element (which
 * is the recommended approach, but only works in more modern browsers) and
 * the <tt>xlink:title</tt> attribute which works on more down-level browsers.
 *
 * @param e an SVG element.
 * @param s a scene node.
 */
pv.SvgScene.title = function(e, s) {
  var a = e.parentNode;
  if (a && (a.tagName != "a")) a = null;
  if (s.title) {
    if (!a) {
      a = this.create("a");
      // for FF>=4 when showing non-title element tooltips
      a.setAttributeNS(this.xlink, "xlink:href", "");
      if (e.parentNode) e.parentNode.replaceChild(a, e);
      a.appendChild(e);
    }

    // Set the title. Using xlink:title ensures the call works in IE
    // but only FireFox seems to show the title.
    // without xlink: in there, it breaks IE.
    a.setAttributeNS(this.xlink, "xlink:title", s.title); // for FF<4

    // for SVG renderers that follow the recommended approach
    var t = null;
    for (var c = e.firstChild; c != null; c = c.nextSibling) {
      if (c.nodeName == "title") {
        t = c;
        break;
      }
    }
    if (!t) {
      t = this.create("title");
      e.appendChild(t);
    } else {
      t.removeChild(t.firstChild); // empty out the text
    }

    if (pv.renderer() == "svgweb") { // SVGWeb needs an extra 'true' to create SVG text nodes properly in IE.
      t.appendChild(document.createTextNode(s.title, true));
    } else {
      t.appendChild(document.createTextNode(s.title));
    }

    return a;
  }
  if (a) a.parentNode.replaceChild(e, a);
  return e;
};

/** TODO */
pv.SvgScene.dispatch = pv.listener(function(e) {
  var t = e.target.$scene;
  if (t) {
    var type = e.type;

    /* Fixes for mousewheel support on Firefox & Opera. */
    switch (type) {
      case "DOMMouseScroll": {
        type = "mousewheel";
        e.wheel = -480 * e.detail;
        break;
      }
      case "mousewheel": {
        e.wheel = (window.opera ? 12 : 1) * e.wheelDelta;
        break;
      }
    }

    if (pv.Mark.dispatch(type, t.scenes, t.index, e)) e.preventDefault();
  }
});

/** @private Remove siblings following element <i>e</i>. */
pv.SvgScene.removeSiblings = function(e) {
  while (e) {
    var n = e.nextSibling;
    // don't remove a sibling <defs> node
    if (e.nodeName != 'defs') {
      e.parentNode.removeChild(e);
    }
    e = n;
  }
};

/** @private Do nothing when rendering undefined mark types. */
pv.SvgScene.undefined = function() {};

pv.SvgScene.removeFillStyleDefinitions = function(scenes) {
  var results = scenes.$g.getElementsByTagName('defs');
  if (results.length === 1) {
    var defs = results[0];
    var cur = defs.firstChild;
    while (cur) {
      var next = cur.nextSibling;
      if (cur.nodeName == 'linearGradient' || cur.nodeName == 'radialGradient') {
        defs.removeChild(cur);
      }
      cur = next;
    }
  }
};


(function() {

  var gradient_definition_id = 0;

  pv.SvgScene.addFillStyleDefinition = function(scenes, fill) {
    var isLinear = fill.type === 'lineargradient';
    if (isLinear || fill.type === 'radialgradient') {
      
      var g = scenes.$g;
      var results = g.getElementsByTagName('defs');
      var defs;
      if(results.length) {
        defs = results[0];
      } else {
        defs = g.appendChild(this.create("defs"));
      }
      
      var elem;
      var className = '__pv_gradient' + fill.id;
      
      // TODO: check this check exists method. It looks wrong...
      
      results = defs.querySelector('.' + className);
      if (!results) {
        var instId = '__pv_gradient' + fill.id + '_inst_' + (++gradient_definition_id);
        
        elem = defs.appendChild(this.create(isLinear ? "linearGradient" : "radialGradient"));
        elem.setAttribute("id",    instId);
        elem.setAttribute("class", className);
//       elem.setAttribute("gradientUnits","userSpaceOnUse");
        
        if(isLinear){
          // x1,y1 -> x2,y2 form the gradient vector
          // See http://www.w3.org/TR/css3-images/#gradients example 11 on calculating the gradient line
          // Gradient-Top angle -> SVG angle -> From diagonal angle
          // angle = (gradAngle - 90) - 45 = angle - 135
          var svgAngle  = fill.angle - Math.PI/2;
          var diagAngle = Math.abs(svgAngle % (Math.PI/2)) - Math.PI/4;
          
          // Radius from the center of the normalized bounding box
          var radius = Math.abs((Math.SQRT2/2) * Math.cos(diagAngle));
          
          var dirx = radius * Math.cos(svgAngle);
          var diry = radius * Math.sin(svgAngle);
          
          var x1 = 0.5 - dirx;
          var y1 = 0.5 - diry;
          var x2 = 0.5 + dirx;
          var y2 = 0.5 + diry;
          
          elem.setAttribute("x1", x1);
          elem.setAttribute("y1", y1);
          elem.setAttribute("x2", x2);
          elem.setAttribute("y2", y2);
        } else {
          // Currently using defaults
//          elem.setAttribute("cx", fill.cx);
//          elem.setAttribute("cy", fill.cy);
//          elem.setAttribute("r",  fill.r );
        }
        
        var stops = fill.stops;
        for (var i = 0, S = stops.length; i < S ; i++) {
          var stop = stops[i];
          var stopElem = elem.appendChild(this.create("stop"));
          var color = stop.color;
          stopElem.setAttribute("offset",       stop.offset + '%' );
          stopElem.setAttribute("stop-color",   color.color       );
          stopElem.setAttribute("stop-opacity", color.opacity + '');
        }

        fill.color = 'url(#' + instId + ')';
      }
    }
  };

})();
