
(function() {
    
    var Point = pv.Shape.Point;
    var Line = pv.Shape.Line;
    
    pv.Shape.Polygon = function(points) {
        this._points = points || [];
    };
    
    var Polygon = pv.Shape.Polygon;
    
    Polygon.prototype = pv.extend(pv.Shape);

    // Overridden by Rect
    Polygon.prototype.points = function() {
        return this._points;
    };
        
    Polygon.prototype.clone = function() {
        return new Polygon(this.points().slice());
    };
    
    Polygon.prototype.apply = function(t) {
        var points = this.points();
        var L = points.length;
        var points2 = new Array(L);
        
        for(var i = 0 ; i < L ; i++) points2[i] = points[i].apply(t);
        
        return new Polygon(points2);
    };

    Polygon.prototype.intersectsRect = function(rect) {
        // I - Any point is inside the rect?
        var i, L;
        var points = this.points();
        
        L = points.length;
        for(i = 0 ; i < L ; i++) if(points[i].intersectsRect(rect)) return true;
        
        // II - Any side intersects the rect?
        var edges = this.edges();
        L = edges.length;
        for(i = 0 ; i < L ; i++) if(edges[i].intersectsRect(rect)) return true;
        
        return false;
    };
    
    Polygon.prototype.edges = function() {
        var edges = this._edges;
        if(!edges) {
            edges = this._edges = [];
            
            var points = this.points();
            var L = points.length;
            if(L) {
                var prevPoint  = points[0];
                var firstPoint = prevPoint;
                
                var point;
                for(var i = 1 ; i < L ; i++) {
                    point = points[i];
                    
                    edges.push(new Line(prevPoint.x, prevPoint.y,  point.x, point.y));
                    
                    prevPoint = point;
                }

                // point will have the last point
                if(L > 2) edges.push(new Line(point.x, point.y,  firstPoint.x, firstPoint.y));
            }
        }
    
        return edges;
    };
    
    Polygon.prototype.distance2 = function(p, k) {
        var min = {cost: Infinity, dist2: Infinity}; //dist2(p, this.center(), k);
        
        this.edges().forEach(function(edge) {
            var d = edge.distance2(p, k);
            if(pv.floatLess(d.cost, min.cost)) min = d;
        }, this);
        
        return min;
    };
    
    Polygon.prototype.center = function() {
        var points = this.points();
        var x = 0;
        var y = 0;
        for(var i = 0, L = points.length ; i < L ; i++) {
            var p = points[i];
            x += p.x;
            y += p.y;
        }
        
        return new Point(x / L, y / L);
    };
    
    // Adapted from http://stackoverflow.com/questions/217578/point-in-polygon-aka-hit-test (author Mecki)
    Polygon.prototype._containsPointCore = function(p) {
        var bbox = this.bbox();
        if(!bbox._containsPointCore(p)) return false;
        
        // "e" ensures the ray starts outside the polygon
        var e = bbox.dx * 0.01;
        var ray = new Line(bbox.x - e, p.y, p.x, p.y);
        
        var intersectCount = 0;
        var edges = this.edges();
        edges.forEach(function(edge) {
            if(edge.intersectsLine(ray)) intersectCount++;
        });
        
        // Inside if odd number of intersections
        return (intersectCount & 1) === 1;
    };
}());
