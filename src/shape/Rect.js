
(function(){
    
    var Point = pv.Shape.Point;
    var Line  = pv.Shape.Line;
    
    pv.Shape.Rect = function(x, y, dx, dy){
        this.x  =  x || 0;
        this.y  =  y || 0;
        this.dx = dx || 0;
        this.dy = dy || 0;
        
        // Ensure normalized
        if(this.dx < 0){
            this.dx = -this.dx;
            this.x  = this.x - this.dx;
        }
        
        if(this.dy < 0){
            this.dy = -this.dy;
            this.y = this.y - this.dy;
        }
        
        this.x2  = this.x + this.dx;
        this.y2  = this.y + this.dy;
    };
    
    var Rect = pv.Shape.Rect;
    
    Rect.prototype = pv.extend(pv.Shape.Polygon);
    
    Rect.prototype.clone = function(){
        var r2 = Object.create(Rect.prototype);
        r2.x  = this.x;
        r2.y  = this.y;
        r2.dx = this.dx;
        r2.dy = this.dy;
        r2.x2 = this.x2;
        r2.y2 = this.y2;
        
        return r2;
    };
    
    Rect.prototype.apply = function(t){
        var x  = t.x + (t.k * this.x);
        var y  = t.y + (t.k * this.y);
        var dx = t.k * this.dx;
        var dy = t.k * this.dy;
        return new Rect(x, y, dx, dy);
    };
    
    Rect.prototype.containsPoint = function(p){
        return this.x <= p.x && p.x <= this.x2 && 
               this.y <= p.y && p.y <= this.y2;
    };
    
    Rect.prototype.intersectsRect = function(rect){
        return (this.x2 > rect.x ) &&  // Some intersection on X
               (this.x  < rect.x2) &&
               (this.y2 > rect.y ) &&  // Some intersection on Y
               (this.y  < rect.y2);
    };
    
    Rect.prototype.edges = function(){
        if(!this._edges){
            var x  = this.x,
                y  = this.y,
                x2 = this.x2,
                y2 = this.y2;
    
            this._edges = [
                new Line(x,  y,  x2, y),
                new Line(x2, y,  x2, y2),
                new Line(x2, y2, x,  y2),
                new Line(x,  y2, x,  y)
            ];
        }
    
        return this._edges;
    };
    
    Rect.prototype.center = function(){
        return new Point(this.x + this.dx/2, this.y + this.dy/2);
    };
    
    Rect.prototype.points = function(){
        var points = this._points;
        if(!points){
            var x  = this.x,
                y  = this.y,
                x2 = this.x2,
                y2 = this.y2;
            
            points = this._points = [
                new Point(x,  y ),
                new Point(x2, y ),
                new Point(x2, y2),
                new Point(x,  y2)
            ];
        }
        
        return points;
    };
    
    Rect.prototype.bbox = function(){
        return this.clone();
    };
    
}());