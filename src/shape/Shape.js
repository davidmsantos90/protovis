
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
    
    pv.Shape.normalizeAngle = function(a){
        a = a % pi2;
        if(a < 0){
            a += pi2;
        }
        
        return a;
    };
    
    // 0 - 2*pi
    pv.Shape.atan2Norm = function(dy, dx){
        // between -pi and pi
        var a = atan2(dy, dx);
        if(a < 0){
            a += pi2;
        }
        
        return a;
    };
    
    // -----------------
    
    pv.Shape.prototype.hasArea = function(){
        return true;
    };
    
    // hasArea
    // apply
    // clone
    // intersectsRect
    // intersectLine (some)
    // containsPoint
    // points
    // edges
    // center
    // distance2
    // bbox (some)
    
}());