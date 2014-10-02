
(function(){
    
    var Arc   = pv.Shape.Arc;
    var Line  = pv.Shape.Line;
    var Point = pv.Shape.Point;
    
    var cos   = Math.cos;
    var sin   = Math.sin;
    var sqrt  = Math.sqrt;
    var pi     = Math.PI;
    var pi_2   = 2*pi;
    var pi_1_2 = pi/2;
    var pi_3_2 = 3*pi/2;
    var atan2Norm = pv.Shape.atan2Norm;
    var normalizeAngle = pv.Shape.normalizeAngle;
    
    pv.Shape.Wedge = function(x, y, innerRadius, outerRadius, startAngle, angleSpan){
        this.x = x;
        this.y = y;
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;

        // Be careful not to transform 2*pi into 0.
        if(!pv.floatBelongsClosed(0, angleSpan, pi_2)) angleSpan = normalizeAngle(angleSpan);

        this.startAngle = normalizeAngle(startAngle);
        this.angleSpan  = angleSpan; // always positive; may be 2*pi;
        this.endAngle   = this.startAngle + angleSpan; // may be > 2*pi
    };
    
    var Wedge = pv.Shape.Wedge;
    
    Wedge.prototype = pv.extend(pv.Shape);
    
    Wedge.prototype.clone = function(){
        return new Wedge(
                this.x, this.y, this.innerRadius, 
                this.outerRadius, this.startAngle, this.angleSpan);
    };
    
    Wedge.prototype.apply = function(t){
        var x   = t.x + (t.k * this.x);
        var y   = t.y + (t.k * this.y);
        var ir  = t.k * this.innerRadius;
        var or  = t.k * this.outerRadius;
        return new Wedge(x, y, ir, or, this.startAngle, this.angleSpan);
    };

    Wedge.prototype.containsAngle = Arc.prototype.containsAngle;

    Wedge.prototype._containsPointCore = function(p){
        var dx = p.x - this.x;
        var dy = p.y - this.y ;
        var r  = sqrt(dx*dx + dy*dy);
        return pv.floatBelongsClosed(this.innerRadius, r, this.outerRadius) && this.containsAngle(atan2Norm(dy, dx));
    };
    
    Wedge.prototype.intersectsRect = function(rect) {
        var i, L, points, edges;
        
        // I - Any point of the wedge is inside the rect?
        points = this.points();
        
        L = points.length;
        for(i = 0 ; i < L ; i++) if(points[i].intersectsRect(rect)) return true;
        
        // II - Any point of the rect inside the wedge?
        points = rect.points();
        L = points.length;
        for(i = 0 ; i < L ; i++) if(this._containsPointCore(points[i])) return true;
        
        // III - Any edge intersects the rect?
        edges = this.edges();
        L = edges.length;
        for(i = 0 ; i < L ; i++) if(edges[i].intersectsRect(rect)) return true;
        
        return false;
    };

    /**
     * Obtains an array of points that describe the shape.
     *
     * The standard returned points are:
     * <ul>
     *     <li>the point at the inner radius and initial angle,</li>
     *     <li>if the inner radius is not zero, the point at the inner radius and final angle,</li>
     *     <li>the point at the outer radius and initial angle,</li>
     *     <li>the point at the outer radius and final angle</li>
     * </ul>
     *
     * Additionally, points lying at multiples of 90º, may be returned.
     *
     * @return {pv.Shape.Point[]} The array of points.
     */
    Wedge.prototype.points = function(){
        if(!this._points) this.edges();
        return this._points;
    };
    
    Wedge.prototype.edges = function() {
        var me = this,
            edges = me._edges;
        if(!edges) {
            var x  = me.x,
                y  = me.y,
                ir = me.innerRadius,
                irPositive = pv.floatGreater(ir, 0),
                or = me.outerRadius,
                ai = me.startAngle,
                af = me.endAngle,
                aa = me.angleSpan,
                cai = cos(ai),
                sai = sin(ai),
                caf = cos(af),
                saf = sin(af),
                pii, pfi; // pi_inner and pf_inner

            if(irPositive) {
                pii = new Point(x + ir * cai, y + ir * sai);
                pfi = new Point(x + ir * caf, y + ir * saf);
            } else {
                pii = pfi = new Point(x, y);
            }

            // pi_outer and pf_outer
            var pio = new Point(x + or * cai, y + or * sai),
                pfo = new Point(x + or * caf, y + or * saf);
            
            edges = me._edges = [];

            // Inner arc
            if(irPositive) edges.push(new Arc(x, y, ir, ai, aa));

            edges.push(
                new Line(pii.x, pii.y, pio.x, pio.y),
                new Arc(x, y, or, ai, aa),
                new Line(pfi.x, pfi.y, pfo.x, pfo.y));
            
            var points = me._points = [pii, pio, pfo];
            if(irPositive) points.push(pfi);

            function addAngle(a) {
                if(me.containsAngle(a, /*inside*/true))
                    points.push(new Point(x + or * cos(a), y + or * sin(a)));
            }

            addAngle(0);
            addAngle(pi_1_2);
            addAngle(pi);
            addAngle(pi_3_2);
        }
        
        return edges;
    };
    
    // Distance (squared) to the border of the Wedge,
    // // or to its center, whichever is smaller.
    Wedge.prototype.distance2 = function(p, k) {
        var min = {cost: Infinity, dist2: Infinity}; //dist2(p, this.center(), k);
        
        this.edges().forEach(function(edge) {
            var d = edge.distance2(p, k);
            if(pv.floatLess(d.cost, min.cost)) min = d;
        });
        
        return min;
    };
    
    Wedge.prototype.center = function(){
        var midAngle  = (this.startAngle  + this.endAngle)/2;
        var midRadius = (this.innerRadius + this.outerRadius)/2;
        return new Point(
                this.x + midRadius * cos(midAngle), 
                this.y + midRadius * sin(midAngle));
    };
}());
