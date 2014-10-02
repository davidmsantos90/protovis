
(function(){
    
    var Point = pv.Shape.Point;
    var dist2 = pv.Shape.dist2;
    var normalizeAngle = pv.Shape.normalizeAngle;
    var atan2Norm = pv.Shape.atan2Norm;
    
    var cos    = Math.cos;
    var sin    = Math.sin;
    var sqrt   = Math.sqrt;
    var pi     = Math.PI;
    var pi_2   = 2*pi;
    var pi_1_2 = pi/2;
    var pi_3_2 = 3*pi/2;
    
    pv.Shape.Arc = function(x, y, radius, startAngle, angleSpan){
        this.x = x;
        this.y = y;
        this.radius = radius;

        // Be careful not to transform 2*pi into 0.
        if(!pv.floatBelongsClosed(0, angleSpan, pi_2)) angleSpan = normalizeAngle(angleSpan);

        this.startAngle = normalizeAngle(startAngle);
        this.angleSpan  = angleSpan; // always positive; may be 2*pi;
        this.endAngle   = this.startAngle + this.angleSpan; // may be > 2*pi
    };
    
    var Arc = pv.Shape.Arc;
    
    Arc.prototype = pv.extend(pv.Shape);
    
    Arc.prototype.hasArea = function() {
        return false;
    };
    
    Arc.prototype.clone = function() {
        var arc = Object.create(Arc.prototype);
        var me = this;
        arc.x = me.x;
        arc.y = me.y;
        arc.radius = me.radius;
        arc.startAngle = me.startAngle;
        arc.angleSpan = me.angleSpan;
        arc.endAngle = me.endAngle;
        return arc;
    };
    
    Arc.prototype.apply = function(t) {
        var x = t.x + (t.k * this.x);
        var y = t.y + (t.k * this.y);
        var r = t.k * this.radius;
        return new Arc(x, y, r, this.startAngle, this.angleSpan);
    };

    Arc.prototype.containsAngle = function(a, inside) {
        if(!pv.floatBelongsClosed(0, a, pi_2)) a = normalizeAngle(a);

        var ai = this.startAngle,
            af = this.endAngle;

        if(inside ? pv.floatBelongsOpen(ai, a, af) : pv.floatBelongsClosed(ai, a, af)) return true;


        if(pv.floatLessOrEqual(af, pi_2)) return false;
        a += pi_2;

        return inside ? pv.floatBelongsOpen(ai, a, af) : pv.floatBelongsClosed(ai, a, af);
    };

    Arc.prototype._containsPointCore = function(p){
        var dx = p.x - this.x;
        var dy = p.y - this.y;
        var r  = sqrt(dx*dx + dy*dy);
        
        return pv.floatEqual(r, this.radius) && this.containsAngle(atan2Norm(dy, dx));
    };

    Arc.prototype.intersectsRect = function(rect) {
        var i;
        
        // I - Any endpoint is inside the rect?
        var points = this.points();
        var L = points.length;
        for(i = 0 ; i < L ; i++) if(points[i].intersectsRect(rect)) return true;
        
        // II - Any rect edge intersects the arc?
        var edges = rect.edges();
        L = edges.length;
        for(i = 0 ; i < L ; i++) if(this.intersectLine(edges[i])) return true;

        return false;
    };
    
    var circleIntersectLine = pv.Shape.Circle.prototype.intersectLine;
    
    Arc.prototype.intersectLine = function(line, isInfiniteLine) {
        var ps = circleIntersectLine.call(this, line, isInfiniteLine);
        if(ps) {
            // Filter ps belonging to the arc
            ps = ps.filter(function(p) { return this._containsPointCore(p); }, this);
            if(ps.length) return ps;
        }
    };

    /**
     * Obtains an array of points that describe the shape.
     *
     * Apart from the initial and final arc points,
     * additional points, lying at multiples of 90º,
     * may be returned.
     *
     * @return {pv.Shape.Point[]} The array of points.
     */
    Arc.prototype.points = function() {
        var me = this,
            x  = me.x,
            y  = me.y,
            r  = me.radius,
            ai = me.startAngle,
            af = me.endAngle,
            points = [
                new Point(x + r * cos(ai), y + r * sin(ai)),
                new Point(x + r * cos(af), y + r * sin(af))
            ];


        function addAngle(a) {
            if(me.containsAngle(a, /*inside*/true))
                points.push(new Point(x + r * cos(a), y + r * sin(a)));
        }

        addAngle(0);
        addAngle(pi_1_2);
        addAngle(pi);
        addAngle(pi_3_2);

        return points;
    };

    Arc.prototype.center = function() {
        var x  = this.x;
        var y  = this.y;
        var r  = this.radius;
        var am = (this.startAngle + this.endAngle) / 2;
        
        return new Point(x + r * cos(am), y + r * sin(am));
    };
    
    Arc.prototype.normal = function(at, shapeCenter) {
        var norm = at.minus(this.x, this.y).norm();
        
        // If shapeCenter point is specified, 
        // return the norm direction that 
        // points to the outside of the shape
        if(shapeCenter) {
            var outside = this.center().minus(shapeCenter);
            if(outside.dot(norm) < 0) {
                // opposite directions
                norm = norm.times(-1);
            }
        }
        
        return norm;
    };

    // Distance (squared) to the border of the Arc (inside or not)
    Arc.prototype.distance2 = function(p, k) {
        var dx = p.x - this.x;
        var dy = p.y - this.y;
        var a  = atan2Norm(dy, dx); // between 0 and 2*pi
        
        if(this.containsAngle(a)) {
            // Within angle span
            
            // The point at the Border of the circle, in the direction from c to p
            var b = new Point(
                    this.x + this.radius * cos(a),
                    this.y + this.radius * sin(a));
            
            return dist2(p, b, k);
        }
        
        // Smallest distance to one of the two arc end points
        var points = this.points();
        var d1 = dist2(p, points[0], k);
        var d2 = dist2(p, points[1], k);
        return pv.floatLess(d1.cost, d2.cost) ? d1 : d2;
    };
   
}());