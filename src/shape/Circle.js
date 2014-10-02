(function(){
    var Point = pv.Shape.Point;
    var dist2 = pv.Shape.dist2;
    var sqrt = Math.sqrt;
    var abs  = Math.abs;
    var pow  = Math.pow;
    
    pv.Shape.Circle = function(x, y, radius){
        this.x = x || 0;
        this.y = y || 0;
        this.radius = radius || 0;
    };
    
    var Circle = pv.Shape.Circle;
    
    Circle.prototype = pv.extend(pv.Shape);
    
    Circle.prototype.clone = function(){
        return new Circle(this.x, this.y, this.radius);
    };
    
    Circle.prototype.apply = function(t){
        var x  = t.x + (t.k * this.x);
        var y  = t.y + (t.k * this.y);
        var r  = t.k * this.radius;
        return new Circle(x, y, r);
    };
    
    // Adapted from http://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection
    Circle.prototype.intersectsRect = function(rect){
        var dx2 = rect.dx / 2,
            dy2 = rect.dy / 2,
            r   = this.radius;
    
        var circleDistX = abs(this.x - rect.x - dx2),
            circleDistY = abs(this.y - rect.y - dy2);
    
        if ((circleDistX > dx2 + r) ||
            (circleDistY > dy2 + r)) {
            return false;
        }
    
        if (circleDistX <= dx2 || circleDistY <= dy2) {
            return true;
        }
        
        var sqCornerDistance = pow(circleDistX - dx2, 2) +
                               pow(circleDistY - dy2, 2);
    
        return sqCornerDistance <= r * r;
    };
    
    // Adapted from http://stackoverflow.com/questions/13053061/circle-line-intersection-points (author arne.b)
    Circle.prototype.intersectLine = function(line, isInfiniteLine) {
        // Line: A -> B 
        var baX = line.x2 - line.x;
        var baY = line.y2 - line.y;
        
        var caX = this.x - line.x;
        var caY = this.y - line.y;

        var ba2  = baX * baX + baY * baY; // square norm of ba
        var bBy2 = baX * caX + baY * caY; // dot product of ba and ca
        var r    = this.radius;
        var c    = caX * caX + caY * caY - r * r;

        var pBy2 = bBy2 / ba2;

        var disc = pBy2 * pBy2 - c / ba2;
        if (disc < 0) {
            return; // no intersection
        }
        
        // if disc == 0 ... dealt with later
        var discSqrt = sqrt(disc);
        var t1 = pBy2 - discSqrt;
        var t2 = pBy2 + discSqrt;
        
        // t1 < 0 || t1 > 1 => p1 off the segment 
        
        var ps = [];
        if(isInfiniteLine || (t1 >= 0 && t1 <= 1)){
            ps.push(new Point(line.x + baX * t1, line.y + baY * t1));
        }
        
        if (disc !== 0) { // t1 != t2
            if(isInfiniteLine || (t2 >= 0 && t2 <= 1)){
                ps.push(new Point(line.x + baX * t2, line.y + baY * t2));
            }
        }
        
        return ps;
    };
    
    Circle.prototype.points = function(){
        return [this.center()];
    };
    
    Circle.prototype.center = function(){
        return new Point(this.x, this.y);
    };
    
    Circle.prototype.normal = function(at){
        return at.minus(this.x, this.y).norm();
    };
    
    Circle.prototype._containsPointCore = function(p){
        var dx = p.x - this.x,
            dy = p.y - this.y,
            r  = this.radius;
        
        return dx * dx + dy * dy <= r * r; 
    };
    
    // Distance (squared) to the border of the circle (inside or not)
    // //or to the center of the circle, whichever is smaller
    Circle.prototype.distance2 = function(p, k){
        var r = this.radius;
            //dx = p.x - this.x,
            //dy = p.y - this.y;
        
        //var dCenter = dist2(p, this, k);
        
        // The point at the Border of the circle, in the direction from c to p
        var b = p.minus(this).norm().times(r).plus(this);
        
        var dBorder = dist2(p, b, k);
        
        return /*dCenter.cost < dBorder.cost ? dCenter : */dBorder; 
    };

    Circle.prototype._calcBBox = function(){
        var r = this.radius, r_2 = 2*r;
        return new pv.Shape.Rect(this.x - r, this.y - r, r_2, r_2);
    };
}());