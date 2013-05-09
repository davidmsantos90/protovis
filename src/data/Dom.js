/**
 * Returns a {@link pv.Dom} operator for the given map. This is a convenience
 * factory method, equivalent to <tt>new pv.Dom(map)</tt>. To apply the operator
 * and retrieve the root node, call {@link pv.Dom#root}; to retrieve all nodes
 * flattened, use {@link pv.Dom#nodes}.
 *
 * @see pv.Dom
 * @param map a map from which to construct a DOM.
 * @returns {pv.Dom} a DOM operator for the specified map.
 */
pv.dom = function(map) {
  return new pv.Dom(map);
};

/**
 * Constructs a DOM operator for the specified map. This constructor should not
 * be invoked directly; use {@link pv.dom} instead.
 *
 * @class Represets a DOM operator for the specified map. This allows easy
 * transformation of a hierarchical JavaScript object (such as a JSON map) to a
 * W3C Document Object Model hierarchy. For more information on which attributes
 * and methods from the specification are supported, see {@link pv.Dom.Node}.
 *
 * <p>Leaves in the map are determined using an associated <i>leaf</i> function;
 * see {@link #leaf}. By default, leaves are any value whose type is not
 * "object", such as numbers or strings.
 *
 * @param map a map from which to construct a DOM.
 */
pv.Dom = function(map) {
  this.$map = map;
};

/** @private The default leaf function. */
pv.Dom.prototype.$leaf = function(n) {
  return typeof n != "object";
};

/**
 * Sets or gets the leaf function for this DOM operator. The leaf function
 * identifies which values in the map are leaves, and which are internal nodes.
 * By default, objects are considered internal nodes, and primitives (such as
 * numbers and strings) are considered leaves.
 *
 * @param {function} f the new leaf function.
 * @returns the current leaf function, or <tt>this</tt>.
 */
pv.Dom.prototype.leaf = function(f) {
  if (arguments.length) {
    this.$leaf = f;
    return this;
  }
  return this.$leaf;
};

/**
 * Applies the DOM operator, returning the root node.
 *
 * @returns {pv.Dom.Node} the root node.
 * @param {string} [nodeName] optional node name for the root.
 */
pv.Dom.prototype.root = function(nodeName) {
  var leaf = this.$leaf, root = recurse(this.$map);

  /** @private */
  function recurse(map) {
    var n = new pv.Dom.Node();
    for (var k in map) {
      var v = map[k];
      n.appendChild(leaf(v) ? new pv.Dom.Node(v) : recurse(v)).nodeName = k;
    }
    return n;
  }

  root.nodeName = nodeName;
  return root;
};

/**
 * Applies the DOM operator, returning the array of all nodes in preorder
 * traversal.
 *
 * @returns {array} the array of nodes in preorder traversal.
 */
pv.Dom.prototype.nodes = function() {
  return this.root().nodes();
};

/**
 * Constructs a DOM node for the specified value. Instances of this class are
 * not typically created directly; instead they are generated from a JavaScript
 * map using the {@link pv.Dom} operator.
 *
 * @class Represents a <tt>Node</tt> in the W3C Document Object Model.
 */
pv.Dom.Node = function(value) {
  if(value !== undefined){
    this.nodeValue = value;
  }
  
  this.childNodes = [];
};

/**
 * The node name. When generated from a map, the node name corresponds to the
 * key at the given level in the map. Note that the root node has no associated
 * key, and thus has an undefined node name (and no <tt>parentNode</tt>).
 *
 * @type string
 * @field pv.Dom.Node.prototype.nodeName
 */

/**
 * The node value. When generated from a map, node value corresponds to the leaf
 * value for leaf nodes, and is undefined for internal nodes.
 *
 * @field pv.Dom.Node.prototype.nodeValue
 */
pv.Dom.Node.prototype.nodeValue = undefined;

/**
 * The array of child nodes. This array is empty for leaf nodes. An easy way to
 * check if child nodes exist is to query <tt>firstChild</tt>.
 *
 * @type array
 * @field pv.Dom.Node.prototype.childNodes
 */

/**
 * The parent node, which is null for root nodes.
 *
 * @type pv.Dom.Node
 */
pv.Dom.Node.prototype.parentNode = null;

/**
 * The first child, which is null for leaf nodes.
 *
 * @type pv.Dom.Node
 */
pv.Dom.Node.prototype.firstChild = null;

/**
 * The last child, which is null for leaf nodes.
 *
 * @type pv.Dom.Node
 */
pv.Dom.Node.prototype.lastChild = null;

/**
 * The previous sibling node, which is null for the first child.
 *
 * @type pv.Dom.Node
 */
pv.Dom.Node.prototype.previousSibling = null;

/**
 * The next sibling node, which is null for the last child.
 *
 * @type pv.Dom.Node
 */
pv.Dom.Node.prototype.nextSibling = null;

/**
 * The index of the first child 
 * whose {@link #_childIndex} is dirty.
 * 
 * @private
 * @type number | null
 */
pv.Dom.Node.prototype._firstDirtyChildIndex = Infinity;

/**
 * Removes the specified child node from this node.
 *
 * @throws Error if the specified child is not a child of this node.
 * @returns {pv.Dom.Node} the removed child.
 */
pv.Dom.Node.prototype.removeChild = function(n) {
  var i = this.childNodes.indexOf(n);
  if (i === -1) throw new Error("child not found");
  
  return this.removeAt(i);
};

/**
 * Appends the specified child node to this node. If the specified child is
 * already part of the DOM, the child is first removed before being added to
 * this node.
 *
 * @returns {pv.Dom.Node} the appended child.
 */
pv.Dom.Node.prototype.appendChild = function(n){
  var pn = n.parentNode;
  if (pn) pn.removeChild(n);
  
  var lc = this.lastChild;
  n.parentNode = this;
  n.previousSibling = lc;
  if (lc) {
      lc.nextSibling = n;
      n._childIndex  = lc._childIndex + 1;
  } else {
      this.firstChild = n;
      n._childIndex   = 0;
  }
  
  this.lastChild = n;
  this.childNodes.push(n);
  
  return n;
};
  
/**
 * Inserts the specified child <i>n</i> before the given reference child
 * <i>r</i> of this node. If <i>r</i> is null, this method is equivalent to
 * {@link #appendChild}. If <i>n</i> is already part of the DOM, it is first
 * removed before being inserted.
 *
 * @throws Error if <i>r</i> is non-null and not a child of this node.
 * @returns {pv.Dom.Node} the inserted child.
 */
pv.Dom.Node.prototype.insertBefore = function(n, r){
  if (!r) return this.appendChild(n);
  
  var ns = this.childNodes;
  var i = ns.indexOf(r);
  if (i === -1) throw new Error("child not found");
  
  return this.insertAt(n, i);
};

/**
 * Inserts the specified child <i>n</i> at the given index. 
 * Any child from the given index onwards will be moved one position to the end. 
 * If <i>i</i> is null, this method is equivalent to
 * {@link #appendChild}. 
 * If <i>n</i> is already part of the DOM, it is first
 * removed before being inserted.
 *
 * @throws Error if <i>i</i> is non-null and greater than the current number of children.
 * @returns {pv.Dom.Node} the inserted child.
 */
pv.Dom.Node.prototype.insertAt = function(n, i) {
    if (i == null){
        return this.appendChild(n);
    }
    
    var ns = this.childNodes;
    var L  = ns.length;
    if (i === L){
        return this.appendChild(n);
    }
    
    if(i > L){
        throw new Error("Index out of range.");
    }

    var pn = n.parentNode;
    if (pn) { // may be that: pn === this, but should i be corrected in case n is below i?
        pn.removeChild(n);
    }
    
    var ni = i + 1;
    var firstDirtyIndex = this._firstDirtyChildIndex;
    if(ni < firstDirtyIndex){
        this._firstDirtyChildIndex = ni;
    }
    
    var r = ns[i];
    n.parentNode  = this;
    n.nextSibling = r;
    n._childIndex = i;
    
    var psib = n.previousSibling = r.previousSibling;
    r.previousSibling = n;
    if (psib) {
        psib.nextSibling = n;
    } else {
        if (r === this.lastChild) {
            this.lastChild = n;
        }
        this.firstChild = n;
    }
    
    this.childNodes.splice(i, 0, n);
    return n;
};

/**
 * Removes the child node at the specified index from this node.
 */
pv.Dom.Node.prototype.removeAt = function(i) {
  var ns = this.childNodes;
  var n = ns[i];
  if(n){
      ns.splice(i, 1);
      
      if(i < ns.length){
          var firstDirtyIndex = this._firstDirtyChildIndex;
          if(i < firstDirtyIndex){
              this._firstDirtyChildIndex = i;
          }
      }
      
      var psib = n.previousSibling;
      var nsib = n.nextSibling;
      if (psib) { 
          psib.nextSibling = nsib;
      } else {
          this.firstChild = nsib;
      }
      
      if (nsib) {
          nsib.previousSibling = psib;
      } else {
          this.lastChild = psib;
      }
      
      n.nextSibling = null;
      n.previousSibling = null;
      n.parentNode = null;
  }
  
  return n;
};

/**
 * Replaces the specified child <i>r</i> of this node with the node <i>n</i>. If
 * <i>n</i> is already part of the DOM, it is first removed before being added.
 *
 * @throws Error if <i>r</i> is not a child of this node.
 */
pv.Dom.Node.prototype.replaceChild = function(n, r) {
  var ns = this.childNodes;
  var i = ns.indexOf(r);
  if (i === -1) throw new Error("child not found");
  
  var pn = n.parentNode;
  if (pn) pn.removeChild(n);
  
  n.parentNode  = this;
  n.nextSibling = r.nextSibling;
  n._childIndex = r._childIndex;
  
  var psib = n.previousSibling = r.previousSibling;
  if (psib) psib.nextSibling = n;
  else this.firstChild = n;
  
  var nsib = r.nextSibling;
  if (nsib) nsib.previousSibling = n;
  else this.lastChild = n;
  
  ns[i] = n;
  
  return r;
};


/**
 * Obtains the child index of this node.
 * Returns -1, if the node has no parent.
 * 
 * @type number
 */
pv.Dom.Node.prototype.childIndex = function(){
  var p = this.parentNode;
  if(p){
      var i = p._firstDirtyChildIndex;
      if(i < Infinity){
          var ns = p.childNodes;
          if(i < ns.length){
              for(var c = ns[i] ; c ; c = c.nextSibling){
                  c._childIndex = i++;
              }
          }
          
          p._firstDirtyChildIndex = Infinity;
      }
      
      return this._childIndex;
  }
  
  return -1;
};

/**
 * Visits each node in the tree in preorder traversal, applying the specified
 * function <i>f</i>. The arguments to the function are:<ol>
 *
 * <li>The current node.
 * <li>The current depth, starting at 0 for the root node.</ol>
 *
 * @param {function} f a function to apply to each node.
 */
pv.Dom.Node.prototype.visitBefore = function(f) {
  function visit(n, i) {
    f(n, i);
    for (var c = n.firstChild; c; c = c.nextSibling) {
      visit(c, i + 1);
    }
  }
  visit(this, 0);
};

/**
 * Visits each node in the tree in postorder traversal, applying the specified
 * function <i>f</i>. The arguments to the function are:<ol>
 *
 * <li>The current node.
 * <li>The current depth, starting at 0 for the root node.</ol>
 *
 * @param {function} f a function to apply to each node.
 */
pv.Dom.Node.prototype.visitAfter = function(f) {
  function visit(n, i) {
    for (var c = n.firstChild; c; c = c.nextSibling) {
      visit(c, i + 1);
    }
    f(n, i);
  }
  visit(this, 0);
};

/**
 * Sorts child nodes of this node, and all descendent nodes recursively, using
 * the specified comparator function <tt>f</tt>. The comparator function is
 * passed two nodes to compare.
 *
 * <p>Note: during the sort operation, the comparator function should not rely
 * on the tree being well-formed; the values of <tt>previousSibling</tt> and
 * <tt>nextSibling</tt> for the nodes being compared are not defined during the
 * sort operation.
 *
 * @param {function} f a comparator function.
 * @returns this.
 */
pv.Dom.Node.prototype.sort = function(f) {
  if (this.firstChild) {
    this._firstDirtyChildIndex = Infinity;
    
    this.childNodes.sort(f);
    
    var p = this.firstChild = this.childNodes[0], c;
    delete p.previousSibling;
    p._childIndex = 0;
    
    for (var i = 1; i < this.childNodes.length; i++) {
      p.sort(f);
      c = this.childNodes[i];
      c._childIndex = i;
      c.previousSibling = p;
      p = p.nextSibling = c;
    }
    
    this.lastChild = p;
    delete p.nextSibling;
    
    p.sort(f);
  }
  
  return this;
};

/**
 * Reverses all sibling nodes.
 *
 * @returns this.
 */
pv.Dom.Node.prototype.reverse = function() {
  var childNodes = [];
  this.visitAfter(function(n) {
      this._firstDirtyChildIndex = Infinity;
      
      while (n.lastChild) childNodes.push(n.removeChild(n.lastChild));
      for (var c; c = childNodes.pop();) n.insertBefore(c, n.firstChild);
    });
  return this;
};

/** Returns all descendants of this node in preorder traversal. */
pv.Dom.Node.prototype.nodes = function() {
  var array = [];

  /** @private */
  function flatten(node) {
    array.push(node);
    node.childNodes.forEach(flatten);
  }

  flatten(this, array);
  return array;
};

/**
 * Toggles the child nodes of this node. If this node is not yet toggled, this
 * method removes all child nodes and appends them to a new <tt>toggled</tt>
 * array attribute on this node. Otherwise, if this node is toggled, this method
 * re-adds all toggled child nodes and deletes the <tt>toggled</tt> attribute.
 *
 * <p>This method has no effect if the node has no child nodes.
 *
 * @param {boolean} [recursive] whether the toggle should apply to descendants.
 */
pv.Dom.Node.prototype.toggle = function(recursive) {
  if (recursive) return this.toggled
      ? this.visitBefore(function(n) { if (n.toggled) n.toggle(); })
      : this.visitAfter(function(n) { if (!n.toggled) n.toggle(); });
  var n = this;
  if (n.toggled) {
    for (var c; c = n.toggled.pop();) n.appendChild(c);
    delete n.toggled;
  } else if (n.lastChild) {
    n.toggled = [];
    while (n.lastChild) n.toggled.push(n.removeChild(n.lastChild));
  }
};

/**
 * Given a flat array of values, returns a simple DOM with each value wrapped by
 * a node that is a child of the root node.
 *
 * @param {array} values.
 * @returns {array} nodes.
 */
pv.nodes = function(values) {
  var root = new pv.Dom.Node();
  for (var i = 0; i < values.length; i++) {
    root.appendChild(new pv.Dom.Node(values[i]));
  }
  return root.nodes();
};
