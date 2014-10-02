
(function(){
    var Point = pv.Shape.Point;
    var dist2 = pv.Shape.dist2;
    
    // -----------------
    
    pv.Shape.Line = function(x, y, x2, y2){
        this.x  = x  || 0;
        this.y  = y  || 0;
        this.x2 = x2 || 0;
        this.y2 = y2 || 0;
    };
    
    var Line = pv.Shape.Line;
    
    Line.prototype = pv.extend(pv.Shape);
    
    Line.prototype.hasArea = function(){
        return false;
    };
    
    Line.prototype.clone = function(){
        return new Line(this.x, this.y, this.x2, this.x2);
    };
    
    Line.prototype.apply = function(t){
        var x  = t.x + (t.k * this.x );
        var y  = t.y + (t.k * this.y );
        var x2 = t.x + (t.k * this.x2);
        var y2 = t.y + (t.k * this.y2);
        return new Line(x, y, x2, y2);
    };
    
    Line.prototype.points = function(){
        return [new Point(this.x, this.y), new Point(this.x2, this.y2)];
    };
    
    Line.prototype.edges = function(){
        return [this];
    };
    
    Line.prototype.center = function(){
        return new Point((this.x + this.x2)/2, (this.y + this.y2)/2);
    };
    
    Line.prototype.normal = function(at, shapeCenter){
        // Any point (at) laying on the line has the same normal 
        var points = this.points();
        var norm = points[1].minus(points[0]).perp().norm();
        
        // If shapeCenter point is specified, 
        // return the norm direction that 
        // points to the outside of the shape
        if(shapeCenter){
            var outside = points[0].minus(shapeCenter);
            if(outside.dot(norm) < 0){
                // opposite directions
                norm = norm.times(-1);
            }
        }
        
        return norm;
    };
    
    Line.prototype.intersectsRect = function(rect) {
        var i, L;
        var points = this.points();
        L = points.length;
        for(i = 0 ; i < L ; i++) if(points[i].intersectsRect(rect)) return true;
        
        var edges = rect.edges();
        L = edges.length;
        for(i = 0 ; i < L ; i++) if(this.intersectsLine(edges[i])) return true;
    
        return false;
    };
    
    Line.prototype._containsPointCore = function(p) {
        var x  = this.x,
            x2 = this.x2,
            y  = this.y,
            y2 = this.y2;
        return pv.floatBelongsClosed(x, p.x, x2) &&
               (pv.floatEqual(x, x2) ?
                pv.floatBelongsClosed(Math.min(y, y2), p.y, Math.max(y, y2)) :
                pv.floatZero((y2-y)/(x2-x) * (p.x-x) + y - p.y));
    };
    
    Line.prototype.intersectsLine = function(b){
        // See: http://local.wasp.uwa.edu.au/~pbourke/geometry/lineline2d/
        var a = this,
    
            x21 = a.x2 - a.x,
            y21 = a.y2 - a.y,
    
            x43 = b.x2 - b.x,
            y43 = b.y2 - b.y,
    
            denom = y43 * x21 - x43 * y21;

        // Parallel lines: no intersection?
        if(pv.floatZero(denom)) return false;
    
        var y13 = a.y - b.y,
            x13 = a.x - b.x,
            numa = (x43 * y13 - y43 * x13),
            numb = (x21 * y13 - y21 * x13);

        // Both 0  => coincident?
        // Only denom 0 => parallel, but not coincident
        if(pv.floatZero(denom)) return pv.floatZero(numa) && pv.floatZero(numb);

        // Intersection not within segment a?
        var ua = numa / denom;
        if(!pv.floatBelongsClosed(0, ua, 1)) return false;

        // Intersection not within segment b?
        var ub = numb / denom;
        if(!pv.floatBelongsClosed(0, ub, 1)) return false;
    
        return true;
    };
    
    // Adapted from http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment (commenter Grumdrig)
    // Return minimum distance (squared) between the point p and the line segment
    // k: cost vector
    Line.prototype.distance2 = function(p, k) {
        // v *--->* w
        //
        //   p *

        var v = this;
        var w = {x: this.x2, y: this.y2};

        // v == w case ?
        var l2 = dist2(v, w).cost;
        if(pv.floatZero(l2)) return dist2(p, v, k);
      
        // Consider the line extending the segment, parameterized as: proj = v + t (w - v).
        // We find projection of point p onto the line.
        // It falls where t = [(p-v) . (w-v)] / |w-v|^2
        var wvx = w.x - v.x;
        var wvy = w.y - v.y;
        
        var t = ((p.x - v.x) * wvx + (p.y - v.y) * wvy) / l2;
        
        if(pv.floatLess   (t, 0)) return dist2(p, v, k); // lies before v, so return the distance between v and p
        if(pv.floatGreater(t, 1)) return dist2(p, w, k); // lies after  w, so return the distance between w and p
        
        var proj = {x: v.x + t * wvx, y: v.y + t * wvy};
        
        return dist2(p, proj, k);
    };
    
}());
