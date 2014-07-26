/**
 * Constructs a new, empty panel with default properties. Panels, with the
 * exception of the root panel, are not typically constructed directly; instead,
 * they are added to an existing panel or mark via {@link pv.Mark#add}.
 *
 * @class Represents a container mark. Panels allow repeated or nested
 * structures, commonly used in small multiple displays where a small
 * visualization is tiled to facilitate comparison across one or more
 * dimensions. Other types of visualizations may benefit from repeated and
 * possibly overlapping structure as well, such as stacked area charts. Panels
 * can also offset the position of marks to provide padding from surrounding
 * content.
 *
 * <p>All Protovis displays have at least one panel; this is the root panel to
 * which marks are rendered. The box model properties (four margins, width and
 * height) are used to offset the positions of contained marks. The data
 * property determines the panel count: a panel is generated once per associated
 * datum. When nested panels are used, property functions can declare additional
 * arguments to access the data associated with enclosing panels.
 *
 * <p>Panels can be rendered inline, facilitating the creation of sparklines.
 * This allows designers to reuse browser layout features, such as text flow and
 * tables; designers can also overlay HTML elements such as rich text and
 * images.
 *
 * <p>All panels have a <tt>children</tt> array (possibly empty) containing the
 * child marks in the order they were added. Panels also have a <tt>root</tt>
 * field which points to the root (outermost) panel; the root panel's root field
 * points to itself.
 *
 * <p>See also the <a href="../../api/">Protovis guide</a>.
 *
 * @extends pv.Bar
 */
pv.Panel = function() {
  pv.Bar.call(this);

  /**
   * The child marks; zero or more {@link pv.Mark}s in the order they were
   * added.
   *
   * @see #add
   * @type pv.Mark[]
   */
  this.children = [];
  this.root = this;

  /**
   * The internal $dom field is set by the Protovis loader; see lang/init.js. It
   * refers to the script element that contains the Protovis specification, so
   * that the panel knows where in the DOM to insert the generated SVG element.
   *
   * @private
   */
  this.$dom = pv.$ && pv.$.s;
};

pv.Panel.prototype = pv.extend(pv.Bar)
    .property("transform")
    .property("overflow", pv.stringLowerCase)
    .property("canvas", function(c) {
        // If not a string, assume that c is the passed-in element, or unspecified (when nully).
        return (typeof c === "string") ? document.getElementById(c) : c;
    });

pv.Panel.prototype.type = "panel";

/**
 * The canvas element; either the string ID of the canvas element in the current
 * document, or a reference to the canvas element itself. If null, a canvas
 * element will be created and inserted into the document at the location of the
 * script element containing the current Protovis specification. This property
 * only applies to root panels and is ignored on nested panels.
 *
 * <p>Note: the "canvas" element here refers to a <tt>div</tt> (or other suitable
 * HTML container element), <i>not</i> a <tt>canvas</tt> element. The name of
 * this property is a historical anachronism from the first implementation that
 * used HTML 5 canvas, rather than SVG.
 *
 * @type string
 * @name pv.Panel.prototype.canvas
 */

/**
 * Specifies whether child marks are clipped when they overflow this panel.
 * This affects the clipping of all this panel's descendant marks.
 *
 * @type string
 * @name pv.Panel.prototype.overflow
 * @see <a href="http://www.w3.org/TR/CSS2/visufx.html#overflow">CSS2</a>
 */

/**
 * The transform to be applied to child marks. The default transform is
 * identity, which has no effect. Note that the panel's own fill and stroke are
 * not affected by the transform, and panel's transform only affects the
 * <tt>scale</tt> of child marks, not the panel itself.
 *
 * @type pv.Transform
 * @name pv.Panel.prototype.transform
 * @see pv.Mark#scale
 */

/**
 * The number of children that have a non-zero {@link pv.Mark#_zOrder}.
 *
 *  @type number
 */
pv.Panel.prototype._zOrderChildCount = 0;

/**
 * Default properties for panels. By default, the margins are zero, the fill
 * style is transparent.
 *
 * @type pv.Panel
 */
pv.Panel.prototype.defaults = new pv.Panel()
    .extend(pv.Bar.prototype.defaults)
    .fillStyle(null) // override Bar default
    .overflow("visible");

/**
 * Returns an anchor with the specified name. This method is overridden such
 * that adding to a panel's anchor adds to the panel, rather than to the panel's
 * parent.
 *
 * @param {string} name the anchor name; either a string or a property function.
 * @returns {pv.Anchor} the new anchor.
 */
pv.Panel.prototype.anchor = function(name) {
  var anchor = pv.Bar.prototype.anchor.call(this, name);
  anchor.parent = this;
  return anchor;
};

/**
 * Adds a new mark of the specified type to this panel. Unlike the normal
 * {@link Mark#add} behavior, adding a mark to a panel does not cause the mark
 * to inherit from the panel. Since the contained marks are offset by the panel
 * margins already, inheriting properties is generally undesirable; of course,
 * it is always possible to change this behavior by calling {@link Mark#extend}
 * explicitly.
 *
 * @param {Function} Type the type of the new mark to add.
 * @returns {pv.Mark} the new mark.
 */
pv.Panel.prototype.add = function(Type) {
  var child = new Type();
  child.parent = this;
  child.root = this.root;
  child.childIndex = this.children.length;
  this.children.push(child);
  
  // Process possibly set zOrder
  var zOrder = (+child._zOrder) || 0; // NaN -> 0
  if(zOrder !== 0) { this._zOrderChildCount++; }

  return child;
};

/** @private Bind this panel, then any child marks recursively. */
pv.Panel.prototype.bind = function() {
  pv.Mark.prototype.bind.call(this);

  var children = this.children;
  for(var i = 0, n = children.length ; i < n ; i++) {
    children[i].bind();
  }
};

/**
 * @private Evaluates all of the properties for this panel for the specified
 * instance <tt>s</tt> in the scene graph, including recursively building the
 * scene graph for child marks.
 *
 * @param s a node in the scene graph; the instance of the panel to build.
 * @see Mark#scene
 */
pv.Panel.prototype.buildInstance = function(s) {
  // calls buildProperties and then buildImplied
  pv.Bar.prototype.buildInstance.call(this, s);

  if(!s.visible) { return; }

  /*
   * Multiply the current scale factor by this panel's transform. Also clear the
   * default index as we recurse into child marks; it will be reset to the
   * current index when the next panel instance is built.
   */
  var scale = this.scale * s.transform.k;
  pv.Mark.prototype.index = -1;

  /*
   * Build each child, passing in the parent (this panel) scene graph node. The
   * child mark's scene is initialized from the corresponding entry in the
   * existing scene graph, such that properties from the previous build can be
   * reused; this is largely to facilitate the recycling of SVG elements.
   */
  var child;
  var children = this.children;
  var childScenes = s.children || (s.children = []);
  for(var i = 0, n = children.length; i < n; i++) {
    child = children[i];
    child.scene = childScenes[i]; // possibly undefined
    child.scale = scale;
    child.build();
    // Leave scene in children, because these might me used
    // during build of siblings; 
    // calling a sibling mark's property method (instance() evaluates to same index).
  }

  /*
   * Once the child marks have been built, the new scene graph nodes are removed
   * from the child marks and placed into the scene graph. The nodes cannot
   * remain on the child nodes because this panel (or a parent panel) may be
   * instantiated multiple times!
   */
  i = n;
  while(i--) {
    child = children[i];
    childScenes[i] = child.scene;
    delete child.scene;
    delete child.scale;
  }

  /* Delete any expired child scenes. */
  childScenes.length = n;
};

/**
 * @private Computes the implied properties for this panel for the specified
 * instance <tt>s</tt> in the scene graph. Panels have two implied
 * properties:<ul>
 *
 * <li>The <tt>canvas</tt> property references the DOM element, typically a DIV,
 * that contains the SVG element that is used to display the visualization. This
 * property may be specified as a string, referring to the unique ID of the
 * element in the DOM. The string is converted to a reference to the DOM
 * element. The width and height of the SVG element is inferred from this DOM
 * element. If no canvas property is specified, a new SVG element is created and
 * inserted into the document, using the panel dimensions; see
 * {@link #createCanvas}.
 *
 * <li>The <tt>children</tt> array, while not a property per se, contains the
 * scene graph for each child mark. This array is initialized to be empty, and
 * is populated above in {@link #buildInstance}.
 *
 * </ul>The current implementation creates the SVG element, if necessary, during
 * the build phase; in the future, it may be preferrable to move this to the
 * update phase, although then the canvas property would be undefined. In
 * addition, DOM inspection is necessary to define the implied width and height
 * properties that may be inferred from the DOM.
 *
 * @param s a node in the scene graph; the instance of the panel to build.
 */
pv.Panel.prototype.buildImplied = function(s) {
  if(!this.parent && !this._buildRootInstanceImplied(s)) {
    // Canvas was stolen by other root panel.
    // Set the root scene instance as invisible, 
    //  to prevent rendering on the stolen canvas.
    s.visible = false;
    return;
  }

  if(!s.transform) { s.transform = pv.Transform.identity; }

  pv.Mark.prototype.buildImplied.call(this, s);
};

pv.Panel.prototype._buildRootInstanceImplied = function(s) {
  // Was a canvas specified for *this* instance?
  var c = s.canvas;
  if(!c) {
    // For every instance that doesn't specify a canvas, 
    //  a new canvas element (a span) is created for it.
    // This is a typical case of a viz having multiple canvas.
    s.canvas = this._rootInstanceGetInlineCanvas(s);
  } else {
    if(!this._rootInstanceStealCanvas(s, c)) { return false; }

    this._rootInstanceInitCanvas(s, c);
  }

  return true;
};

pv.Panel.prototype._rootInstanceStealCanvas = function(s, c) {
  // Clear the container if it's not associated with this panel.
  // This may happen if concurrent viz's are using the same canvas
  //  and start stealing the canvas to one another...
  // TODO: There's no provision here to deal with the same canvas being used
  //  by different instances of the same root panel?
  // If this is the first render of this root panel, 
  //  then we're allowed to steal it from another panel.
  // If this is not our first render, 
  //  then just accept that the canvas has been stolen.
  var cPanel = c.$panel;
  if(cPanel !== this) {
    if(cPanel) {
      if(this.$lastCreateId) {
        // Let the current canvas panel win the fight.
        return false;
      }

      // We win the fight, 
      // dispose the other root panel.
      cPanel._disposeRootPanel();
      
      this._updateCreateId(c);  
    }
    
    c.$panel = this;
    pv.removeChildren(c);
  } else {
    // Update createId
    this._updateCreateId(c);
  }
  return true;
};

pv.Panel.prototype._registerBoundEvent = function(source, name, listener, capturePhase) {
  if(source.removeEventListener) {
    var boundEvents = this._boundEvents || (this._boundEvents = []);
    boundEvents.push([source, name, listener, capturePhase]);
  }
};

pv.Panel.prototype._disposeRootPanel = function() {
  // Clear running transitions.
  // If we don't do this,
  //  a running animation's setTimeouts will
  //  continue rendering, over a canvas that 
  //  might already b being used by other panel,
  //  resulting in "concurrent" updates to 
  //  the same dom elements -- a big mess.
  var t = this.$transition;
  t && t.stop();

  var boundEvents = this._boundEvents;
  if(boundEvents) {
    this._boundEvents = null;

    for(var i = 0, L = boundEvents.length; i < L ; i++) {
      var be = boundEvents[i];
      be[0].removeEventListener(be[1], be[2], be[3]);
    }
  }
};

pv.Panel.prototype._rootInstanceInitCanvas = function(s, c) {
  // If width and height weren't specified, inspect the container.
  var w, h, cssStyle;
  if(s.width == null) {
    cssStyle = pv.cssStyle(c);
    w = parseFloat(cssStyle("width") || 0);
    s.width = w - s.left - s.right;
  }

  if(s.height == null) {
    cssStyle || (cssStyle = pv.cssStyle(c));
    h = parseFloat(cssStyle("height") || 0);
    s.height = h - s.top - s.bottom;
  }

  cssStyle = null;
};

pv.Panel.prototype._rootInstanceGetInlineCanvas = function(s) {
  // When no container is specified, 
  //  the vis is added inline, as a span.
  // The spans are created on first render only, 
  //  and cached for later renders.
  // If the visualization was created using a 
  //  script element with language "text/javascript+protovis",
  //  the span of each instance is added right before the script tag.
  // Otherwise, the canvas is added as a sibling of 
  //  the last (leaf) element of the page.
  var cache = this.$canvas || (this.$canvas = []);
  var c;
  if(!(c = cache[this.index])) {
    c = cache[this.index] =  document.createElement("span");
    if(this.$dom) {
      // Script element for text/javascript+protovis
      this.$dom.parentNode.insertBefore(c, this.$dom);
    } else {
      // Find the last (leaf) element in the body.
      var n = document.body;
      while(n.lastChild && n.lastChild.tagName) { n = n.lastChild; }

      // Take its parent.
      if(n != document.body) { n = n.parentNode; }
      
      // Add canvas as last child.
      n.appendChild(c);
    }
  }
  return c;
};

/** 
 * Updates the protovis create counter in the specified canvas.
 * This allows external entities to detect that a previous
 * panel attached to this canvas has been disposed of, 
 * or is no longer in control of this panel.
 * Also, by storing the latest counter on which this panel updated
 *  the canvas we're able to detect when we lost the canvas,
 *  and should not keep stealing it.
 */
pv.Panel.prototype._updateCreateId = function(c) {
    this.$lastCreateId = c.$pvCreateId = (c.$pvCreateId || 0) + 1;
};
