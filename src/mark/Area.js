/**
 * Constructs a new area mark with default properties. Areas are not typically
 * constructed directly, but by adding to a panel or an existing mark via
 * {@link pv.Mark#add}.
 *
 * @class Represents an area mark: the solid area between two series of
 * connected line segments. Unsurprisingly, areas are used most frequently for
 * area charts.
 *
 * <p>Just as a line represents a polyline, the <tt>Area</tt> mark type
 * represents a <i>polygon</i>. However, an area is not an arbitrary polygon;
 * vertices are paired either horizontally or vertically into parallel
 * <i>spans</i>, and each span corresponds to an associated datum. Either the
 * width or the height must be specified, but not both; this determines whether
 * the area is horizontally-oriented or vertically-oriented.  Like lines, areas
 * can be stroked and filled with arbitrary colors.
 *
 * <p>See also the <a href="../../api/Area.html">Area guide</a>.
 *
 * @extends pv.Mark
 */
pv.Area = function() {
  pv.Mark.call(this);
};

pv.Area.castSegmented = function(v) {
  if(!v) { return ''; }
  
  v = v.toLowerCase();

  switch(v) {
    case 'smart':
    case 'full': break;
    
    default: v = 'full';
  }
  
  return v;
};

pv.Area.prototype = pv.extend(pv.Mark)
    .property("width", Number)
    .property("height", Number)
    .property("lineWidth", Number)
    .property("lineJoin",        pv.stringLowerCase)
    .property("strokeMiterLimit", Number)
    .property("lineCap",         pv.stringLowerCase)
    .property("strokeDasharray", pv.stringLowerCase)
    .property("strokeStyle", pv.fillStyle)
    .property("fillStyle", pv.fillStyle)
    .property("segmented", pv.Area.castSegmented)
    .property("interpolate", pv.stringLowerCase)
    .property("tension", Number);

pv.Area.prototype.type = "area";

/**
 * The width of a given span, in pixels; used for horizontal spans. If the width
 * is specified, the height property should be 0 (the default). Either the top
 * or bottom property should be used to space the spans vertically, typically as
 * a multiple of the index.
 *
 * @type number
 * @name pv.Area.prototype.width
 */

/**
 * The height of a given span, in pixels; used for vertical spans. If the height
 * is specified, the width property should be 0 (the default). Either the left
 * or right property should be used to space the spans horizontally, typically
 * as a multiple of the index.
 *
 * @type number
 * @name pv.Area.prototype.height
 */

/**
 * The width of stroked lines, in pixels; used in conjunction with
 * <tt>strokeStyle</tt> to stroke the perimeter of the area. Unlike the
 * {@link Line} mark type, the entire perimeter is stroked, rather than just one
 * edge. The default value of this property is 1.5, but since the default stroke
 * style is null, area marks are not stroked by default.
 *
 * <p>This property is <i>fixed</i> for non-segmented areas. See
 * {@link pv.Mark}.
 *
 * @type number
 * @name pv.Area.prototype.lineWidth
 */

/**
 * The style of stroked lines; used in conjunction with <tt>lineWidth</tt> to
 * stroke the perimeter of the area. Unlike the {@link Line} mark type, the
 * entire perimeter is stroked, rather than just one edge. The default value of
 * this property is null, meaning areas are not stroked by default.
 *
 * <p>This property is <i>fixed</i> for non-segmented areas. See
 * {@link pv.Mark}.
 *
 * @type string
 * @name pv.Area.prototype.strokeStyle
 * @see pv.color
 */

/**
 * The area fill style; if non-null, the interior of the polygon forming the
 * area is filled with the specified color. The default value of this property
 * is a categorical color.
 *
 * <p>This property is <i>fixed</i> for non-segmented areas. See
 * {@link pv.Mark}.
 *
 * @type string
 * @name pv.Area.prototype.fillStyle
 * @see pv.color
 */

/**
 * Whether the area is segmented; whether variations in fill style, stroke
 * style, and the other properties are treated as fixed. Rendering segmented
 * areas is noticeably slower than non-segmented areas.
 *
 * <p>This property is <i>fixed</i>. See {@link pv.Mark}.
 *
 * @type boolean
 * @name pv.Area.prototype.segmented
 */

/**
 * How to interpolate between values. Linear interpolation ("linear") is the
 * default, producing a straight line between points. For piecewise constant
 * functions (i.e., step functions), either "step-before" or "step-after" can be
 * specified. To draw open uniform b-splines, specify "basis". To draw cardinal
 * splines, specify "cardinal"; see also {@link #tension}.
 *
 * <p>This property is <i>fixed</i>. See {@link pv.Mark}.
 *
 * @type string
 * @name pv.Area.prototype.interpolate
 */

/**
 * The tension of cardinal splines; used in conjunction with
 * interpolate("cardinal"). A value between 0 and 1 draws cardinal splines with
 * the given tension. In some sense, the tension can be interpreted as the
 * "length" of the tangent; a tension of 1 will yield all zero tangents (i.e.,
 * linear interpolation), and a tension of 0 yields a Catmull-Rom spline. The
 * default value is 0.7.
 *
 * <p>This property is <i>fixed</i>. See {@link pv.Mark}.
 *
 * @type number
 * @name pv.Area.prototype.tension
 */

/**
 * Default properties for areas. By default, there is no stroke and the fill
 * style is a categorical color.
 *
 * @type pv.Area
 */
pv.Area.prototype.defaults = new pv.Area()
    .extend(pv.Mark.prototype.defaults)
    .lineWidth(1.5)
    .fillStyle(pv.Colors.category20().by(pv.parent))
    .interpolate("linear")
    .tension(.7)
    .lineJoin("miter")
    .strokeMiterLimit(8)
    .lineCap("butt")
    .strokeDasharray("none");

/** @private Sets width and height to zero if null. */
pv.Area.prototype.buildImplied = function(s) {
  if (s.height == null) s.height = 0;
  if (s.width == null) s.width = 0;
  pv.Mark.prototype.buildImplied.call(this, s);
};

/** @private Records which properties may be fixed. */
pv.Area.fixed = {
  lineWidth: 1,
  lineJoin: 1,
  strokeMiterLimit: 1,
  lineCap: 1,
  strokeStyle: 1,
  strokeDasharray: 1,
  fillStyle: 1,
  segmented: 1,
  interpolate: 1,
  tension: 1
};

/**
 * @private Make segmented required, such that this fixed property is always
 * evaluated, even if the first segment is not visible. Also cache which
 * properties are normally fixed.
 */
pv.Area.prototype.bind = function() {
  pv.Mark.prototype.bind.call(this);
  var binds = this.binds,
      required = binds.required,
      optional = binds.optional;
  for (var i = 0, n = optional.length; i < n; i++) {
    var p = optional[i];
    p.fixed = p.name in pv.Area.fixed;
    if (p.name == "segmented") {
      required.push(p);
      optional.splice(i, 1);
      i--;
      n--;
    }
  }

  /* Cache the original arrays so they can be restored on build. */
  this.binds.$required = required;
  this.binds.$optional = optional;
};

/**
 * @private Override the default build behavior such that fixed properties are
 * determined dynamically, based on the value of the (always) fixed segmented
 * property. Any fixed properties are only evaluated on the first instance,
 * although their values are propagated to subsequent instances, so that they
 * are available for property chaining and the like.
 */
pv.Area.prototype.buildInstance = function(s) {
  var binds = this.binds;

  /* Handle fixed properties on secondary instances. */
  if (this.index) {
    var fixed = binds.fixed;

    /* Determine which properties are fixed. */
    if (!fixed) {
      fixed = binds.fixed = [];
      
      function f(p) { return !p.fixed || (fixed.push(p), false); }
      
      binds.required = binds.required.filter(f);
      if (!this.scene[0].segmented) binds.optional = binds.optional.filter(f);
    }

    /* Copy fixed property values from the first instance. */
    var n = fixed.length;
    if(n){
      var firstScene = this.scene[0];
      for (var i = 0 ; i < n ; i++) {
        var p = fixed[i].name;
        s[p] = firstScene[p];
      }
    }
  }

  /* Evaluate all properties on the first instance. */
  else {
    binds.required = binds.$required;
    binds.optional = binds.$optional;
    binds.fixed = null;
  }

  pv.Mark.prototype.buildInstance.call(this, s);
};

/**
 * Constructs a new area anchor with default properties. Areas support five
 * different anchors:<ul>
 *
 * <li>top
 * <li>left
 * <li>center
 * <li>bottom
 * <li>right
 *
 * </ul>In addition to positioning properties (left, right, top bottom), the
 * anchors support text rendering properties (text-align, text-baseline). Text
 * is rendered to appear inside the area. The area anchor also propagates the
 * interpolate, eccentricity, and tension properties such that an anchored area
 * or line will match positions between control points.
 *
 * <p>For consistency with the other mark types, the anchor positions are
 * defined in terms of their opposite edge. For example, the top anchor defines
 * the bottom property, such that an area added to the top anchor grows upward.
 *
 * @param {string} name the anchor name; either a string or a property function.
 * @returns {pv.Anchor}
 */
pv.Area.prototype.anchor = function(name) {
  return pv.Mark.prototype.anchor.call(this, name)
    .interpolate (function() { return this.scene.target[this.index].interpolate;  })
    .eccentricity(function() { return this.scene.target[this.index].eccentricity; })
    .tension     (function() { return this.scene.target[this.index].tension;      });
};

pv.Area.prototype.getEventHandler = function(type, scene, index, ev) {
  // mouseover -> 1. mouseover different scene/instance
  //
  // mousemove -> 1. mousemove different scene/instance
  //           -> 2. mouseover different scene/instance
    
  var s = scene[index];
  var needEventSimulation = pv.Scene.mousePositionEventSet[type] === 1 && 
                            (!s.segmented || s.segmented === 'smart');

  if(!needEventSimulation) {
    return pv.Mark.prototype.getEventHandler.call(this, type, scene, index, ev);
  }
  
  var handlerMouseOver = (type === 'mousemove') ? this.$handlers.mouseover : null;
  var handler  = this.$handlers[type];
  var handlers = handler || handlerMouseOver;
  var mouseIndex;
  if(handlers) {
    mouseIndex = this.getNearestInstanceToMouse(scene, index);
    
    if(handlerMouseOver && !this.filterMouseMove(scene, mouseIndex)) {
        handlerMouseOver = null;
        handlers = handler;
    }
  }
    
  if(!handlers) return this.getParentEventHandler(type, scene, index, ev);
  
  if(handler && handlerMouseOver) handlers = [].concat(handler, handlerMouseOver);
  
  return [handlers, scene, mouseIndex, ev];
};

pv.Area.prototype.filterMouseMove = function(scene, mouseIndex) {
  // First mouseover event?
  // On a != scene group?
  // Or on a != index of the previous scene group?
  var prevMouseOverScene = this._mouseOverScene;
  if(!prevMouseOverScene || 
     prevMouseOverScene !== scene || 
     this._mouseOverIndex !== mouseIndex) {
    
    this._mouseOverScene = scene;
    this._mouseOverIndex = mouseIndex;
    return true;
  }
  // else Skip event. Same scene.
};

pv.Area.prototype.getNearestInstanceToMouse = function(scene, eventIndex) {
  var p = this.mouse();
  var minDist2 = Infinity;
  var minIndex = null;

  // TODO: stop at last segment
  for(var index = eventIndex, L = scene.length; index < L; index++) {
    var shape = this.getShape(scene, index);
    if(shape) {
      if(shape.containsPoint(p)) { return index; }
      
      var dist2 = shape.distance2(p).dist2;
      if(dist2 < minDist2) {
        minDist2 = dist2;
        minIndex = index;
      }
    }
  }

  return minIndex != null ? minIndex : eventIndex;
};


pv.Area.prototype.getShapeCore = function(scenes, index){
    var s = scenes[index];
    var w = (s.width  || 0),
        h = (s.height || 0),
        x = s.left,
        y = s.top;
    
    var s2 = index + 1 < scenes.length ? scenes[index + 1] : null;
    if(!s2 || !s2.visible){
        return new pv.Shape.Line(x, y, x + w, y + h);
    }
    
    var x2 = s2.left,
        y2 = s2.top,
        h2 = s2.height || 0,
        w2 = s2.width  || 0;
    
    return new pv.Shape.Polygon([
        new pv.Vector(x,       y      ),
        new pv.Vector(x2,      y2     ),
        new pv.Vector(x2 + w2, y2 + h2),
        new pv.Vector(x  + w,  y  + h )
    ]);
};
