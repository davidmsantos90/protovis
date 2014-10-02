
(function(){

    pv.Shape = function(){};
    
    // -----------------
    
    var _k0 = {x: 1, y: 1};

    pv.Shape.dist2 = function(v, w, k) {
        k = k || _k0;
        
        var dx = v.x - w.x;
        var dy = v.y - w.y;
        var dx2 = dx*dx;
        var dy2 = dy*dy;
        
        return {
            cost:  dx2 + dy2,
            dist2: k.x * dx2 + k.y * dy2
        };
    };
    
    // Returns an angle between 0 and and 2*pi
    var pi    = Math.PI;
    var pi2   = 2 * pi;
    var atan2 = Math.atan2;
    
    pv.Shape.normalizeAngle = function(a) {
        a = a % pi2;
        if(pv.floatLess(a, 0)) a += pi2;
        return a;
    };
    
    // 0 - 2*pi
    pv.Shape.atan2Norm = function(dy, dx) {
        // between -pi and pi
        var a = atan2(dy, dx);
        if(pv.floatLess(a, 0)) a += pi2;
        return a;
    };
    
    // -----------------
    
    pv.Shape.prototype.hasArea = function() {
        return true;
    };

    /**
     * Obtains a shape's bounding box.
     *
     * The returned bounding box rectangle is a cached instance.
     * Do <b>not</b> modify it.
     *
     * @return {pv.Shape.Rect} The shape's bounding box.
     */
    pv.Shape.prototype.bbox = function() {
        return this._bbox || (this._bbox = this._calcBBox());
    };

    /**
     * Calculates the shape's bounding box.
     * The default implementation calculates the bounding box based on the list of points
     * returned by {@link pv.Shape#points}.
     *
     * @return {pv.Shape.Rect} The shape's bounding box.
     * @protected
     * @virtual
     */
    pv.Shape.prototype._calcBBox = function() {
        var minX, minY, maxX, maxY;
        this
        .points()
        .forEach(function(point) {
            var x = point.x, y = point.y;
            if(minX == null) {
                minX = maxX = x;
                minY = maxY = y;
            } else {
                if(x < minX) minX = x; else if(x > maxX) maxX = x;
                if(y < minY) minY = y; else if(y > maxY) maxY = y;
            }
        });

        if(minX != null) return new pv.Shape.Rect(minX, minY, maxX - minX, maxY - minY);
    };

    pv.Shape.prototype.containsPoint = function(p, k) {
        if(k) {
            var bbox;
            // assert (k.x || k.y)
            if(!k.y) return (bbox = this.bbox()), pv.floatBelongsClosed(bbox.x, p.x, bbox.x2); // => k.x
            if(!k.x) return (bbox = this.bbox()), pv.floatBelongsClosed(bbox.y, p.y, bbox.y2); // => k.y
        }
        return this._containsPointCore(p);
    };

    pv.Shape.prototype._containsPointCore = function(/*p*/) {
        return false;
    };

    // hasArea
    // apply
    // clone
    // intersectsRect
    // intersectLine (some)
    // points
    // edges
    // center
    // distance2
    
}());