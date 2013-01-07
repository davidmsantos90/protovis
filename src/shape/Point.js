
(function(){
    
    var dist2 = pv.Shape.dist2;
    var cos   = Math.cos;
    var sin   = Math.sin;
    var sqrt  = Math.sqrt;
    
    
    /**
     * Returns a {@link pv.Vector} for the specified <i>x</i> and <i>y</i>
     * coordinate. This is a convenience factory method, equivalent to <tt>new
     * pv.Vector(x, y)</tt>.
     *
     * @see pv.Vector
     * @param {number} x the <i>x</i> coordinate.
     * @param {number} y the <i>y</i> coordinate.
     * @returns {pv.Vector} a vector for the specified coordinates.
     */
    pv.vector = function(x, y) {
      return new Point(x, y);
    };
    
    /**
     * Constructs a {@link pv.Vector} for the specified <i>x</i> and <i>y</i>
     * coordinate. This constructor should not be invoked directly; use
     * {@link pv.vector} instead.
     *
     * @class Represents a two-dimensional vector; a 2-tuple <i>&#x27e8;x,
     * y&#x27e9;</i>. The intent of this class is to simplify vector math. Note that
     * in performance-sensitive cases it may be more efficient to represent 2D
     * vectors as simple objects with <tt>x</tt> and <tt>y</tt> attributes, rather
     * than using instances of this class.
     *
     * @param {number} x the <i>x</i> coordinate.
     * @param {number} y the <i>y</i> coordinate.
     */
    pv.Vector = function(x, y) {
      this.x = x;
      this.y = y;
    };
    
    var Point = pv.Shape.Point = pv.Vector;
    
    pv.Vector.prototype = pv.extend(pv.Shape);
    
    /**
     * Returns a vector perpendicular to this vector: <i>&#x27e8;-y, x&#x27e9;</i>.
     *
     * @returns {pv.Vector} a perpendicular vector.
     */
    pv.Vector.prototype.perp = function() {
      return new Point(-this.y, this.x);
    };
    
    /**
     * Returns a vector which is the result of rotating this vector by the specified angle.
     * 
     * @returns {pv.Vector} a rotated vector.
     */
    pv.Vector.prototype.rotate = function(angle) {
        var c = cos(angle);
        var s = sin(angle);
        
        return new Point(c*this.x -s*this.y, s*this.x + c*this.y);
    };
    
    /**
     * Returns a normalized copy of this vector: a vector with the same direction,
     * but unit length. If this vector has zero length this method returns a copy of
     * this vector.
     *
     * @returns {pv.Vector} a unit vector.
     */
    pv.Vector.prototype.norm = function() {
      var l = this.length();
      return this.times(l ? (1 / l) : 1);
    };
    
    /**
     * Returns the magnitude of this vector, defined as <i>sqrt(x * x + y * y)</i>.
     *
     * @returns {number} a length.
     */
    pv.Vector.prototype.length = function() {
      return sqrt(this.x * this.x + this.y * this.y);
    };
    
    /**
     * Returns a scaled copy of this vector: <i>&#x27e8;x * k, y * k&#x27e9;</i>.
     * To perform the equivalent divide operation, use <i>1 / k</i>.
     *
     * @param {number} k the scale factor.
     * @returns {pv.Vector} a scaled vector.
     */
    pv.Vector.prototype.times = function(k) {
      return new Point(this.x * k, this.y * k);
    };
    
    /**
     * Returns this vector plus the vector <i>v</i>: <i>&#x27e8;x + v.x, y +
     * v.y&#x27e9;</i>. If only one argument is specified, it is interpreted as the
     * vector <i>v</i>.
     *
     * @param {number} x the <i>x</i> coordinate to add.
     * @param {number} y the <i>y</i> coordinate to add.
     * @returns {pv.Vector} a new vector.
     */
    pv.Vector.prototype.plus = function(x, y) {
      return (arguments.length == 1)
          ? new Point(this.x + x.x, this.y + x.y)
          : new Point(this.x + x, this.y + y);
    };
    
    /**
     * Returns this vector minus the vector <i>v</i>: <i>&#x27e8;x - v.x, y -
     * v.y&#x27e9;</i>. If only one argument is specified, it is interpreted as the
     * vector <i>v</i>.
     *
     * @param {number} x the <i>x</i> coordinate to subtract.
     * @param {number} y the <i>y</i> coordinate to subtract.
     * @returns {pv.Vector} a new vector.
     */
    pv.Vector.prototype.minus = function(x, y) {
      return (arguments.length == 1)
          ? new Point(this.x - x.x, this.y - x.y)
          : new Point(this.x - x, this.y - y);
    };
    
    /**
     * Returns the dot product of this vector and the vector <i>v</i>: <i>x * v.x +
     * y * v.y</i>. If only one argument is specified, it is interpreted as the
     * vector <i>v</i>.
     *
     * @param {number} x the <i>x</i> coordinate to dot.
     * @param {number} y the <i>y</i> coordinate to dot.
     * @returns {number} a dot product.
     */
    pv.Vector.prototype.dot = function(x, y) {
      return (arguments.length == 1)
          ? this.x * x.x + this.y * x.y
          : this.x * x + this.y * y;
    };
    
    pv.Vector.prototype.hasArea = function(){
        return false;
    };
    
    pv.Vector.prototype.clone = function(){
        return new Point(this.x, this.y);
    };
    
    pv.Vector.prototype.apply = function(t){
        return new Point(t.x + (t.k * this.x), t.y + (t.k * this.y));
    };
    
    pv.Vector.prototype.intersectsRect = function(rect){
        // Does rect contain the point
        return (this.x >= rect.x) && (this.x <= rect.x2) &&
               (this.y >= rect.y) && (this.y <= rect.y2);
    };
    
    pv.Vector.prototype.containsPoint = function(p){
        return (this.x === p.x) && (this.y === p.y);
    };
    
    pv.Vector.prototype.points = function(){
        return [this];
    };
    
    pv.Vector.prototype.edges = function(){
        return [];
    };
    
    pv.Vector.prototype.center = function(){
        return this;
    };
    
    pv.Vector.prototype.distance2 = function(p, k){
        return dist2(this, p, k);
    };
}());
