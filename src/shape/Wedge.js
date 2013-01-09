
(function(){
    
    var Arc   = pv.Shape.Arc;
    var Line  = pv.Shape.Line;
    var Point = pv.Shape.Point;
    
    var cos   = Math.cos;
    var sin   = Math.sin;
    var sqrt  = Math.sqrt;
    var atan2Norm = pv.Shape.atan2Norm;
    var normalizeAngle = pv.Shape.normalizeAngle;
    
    pv.Shape.Wedge = function(x, y, innerRadius, outerRadius, startAngle, angleSpan){
        this.x = x;
        this.y = y;
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;
        
        this.startAngle = normalizeAngle(startAngle);
        this.angleSpan  = normalizeAngle(angleSpan); // always positive...
        this.endAngle   = this.startAngle + this.angleSpan; // may be > 2*pi
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
    
    Wedge.prototype.containsPoint = function(p){
        var dx = p.x - this.x;
        var dy = p.y - this.y ;
        var r  = sqrt(dx*dx + dy*dy);
        if(r >= this.innerRadius &&  r <= this.outerRadius){
            var a  = atan2Norm(dy, dx); // between -pi and pi -> 0 - 2*pi
            return this.startAngle <= a && a <= this.endAngle;
        }
        
        return false;
    };
    
    Wedge.prototype.intersectsRect = function(rect){
        var i, L;
        
        // I - Any point of the wedge is inside the rect?
        var points = this.points();
        
        L = points.length;
        for(i = 0 ; i < L ; i++){
            if(points[i].intersectsRect(rect)){
                return true;
            }
        }
        
        // II - Any point of the rect inside the wedge?
        points = rect.points();
        L = points.length;
        for(i = 0 ; i < L ; i++){
            if(this.containsPoint(points[i])){
                return true;
            }
        }
        
        // III - Any edge intersects the rect?
        var edges = this.edges();
        L = edges.length;
        for(i = 0 ; i < L ; i++){
            if(edges[i].intersectsRect(rect)){
                return true;
            }
        }
        
        return false;
    };
    
    Wedge.prototype.points = function(){
        if(!this._points){
            this.edges();
        }
        
        return this._points;
    };
    
    Wedge.prototype.edges = function(){
        var edges = this._edges;
        if(!edges){
            var x  = this.x;
            var y  = this.y;
            var ir = this.innerRadius;
            var or = this.outerRadius;
            var ai = this.startAngle;
            var af = this.endAngle;
            var aa = this.angleSpan;
            var cai = cos(ai);
            var sai = sin(ai);
            var caf = cos(af);
            var saf = sin(af);
            
            var pii, pfi;
            if(ir > 0){
                pii = new Point(x + ir * cai, y + ir * sai);
                pfi = new Point(x + ir * caf, y + ir * saf);
            } else {
                pii = pfi = new Point(x, y);
            }
            
            var pio = new Point(x + or * cai, y + or * sai);
            var pfo = new Point(x + or * caf, y + or * saf);
            
            edges = this._edges = [];
            
            if(ir > 0){
               edges.push(new Arc(x, y, ir, ai, aa));
            }
            
            edges.push(
                new Line(pii.x, pii.y, pio.x, pio.y),
                new Arc(x, y, or, ai, aa),
                new Line(pfi.x, pfi.y, pfo.x, pfo.y));
            
            var points = this._points = [pii, pio, pfo];
            if(ir > 0){
                points.push(pfi);
            }
        }
        
        return edges;
    };
    
    // Distance (squared) to the border of the Wedge,
    // // or to its center, whichever is smaller.
    Wedge.prototype.distance2 = function(p, k){
        var min = {cost: Infinity, dist2: Infinity}; //dist2(p, this.center(), k);
        
        this.edges().forEach(function(edge){
            var d = edge.distance2(p, k);
            if(d.cost < min.cost){
                min = d;
            }
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
