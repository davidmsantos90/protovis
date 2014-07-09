/**
 * Returns a new point behavior to be registered on mousemove events.
 *
 * @class Implements interactive fuzzy pointing, identifying marks that are in
 * close proximity to the mouse cursor. This behavior is an alternative to the
 * native mouseover and mouseout events, improving usability. Rather than
 * requiring the user to mouseover a mark exactly, the mouse simply needs to
 * move near the given mark and a "point" event is triggered. In addition, if
 * multiple marks overlap, the point behavior can be used to identify the mark
 * instance closest to the cursor, as opposed to the one that is rendered on
 * top.
 *
 * <p>The point behavior can also identify the closest mark instance for marks
 * that produce a continuous graphic primitive. The point behavior can thus be
 * used to provide details-on-demand for both discrete marks (such as dots and
 * bars), as well as continuous marks (such as lines and areas).
 *
 * <p>This behavior is implemented by finding the closest mark instance to the
 * mouse cursor on every mousemove event. If this closest mark is within the
 * given radius threshold, which defaults to 30 pixels, a "point" psuedo-event
 * is dispatched to the given mark instance. If any mark were previously
 * pointed, it would receive a corresponding "unpoint" event. These two
 * psuedo-event types correspond to the native "mouseover" and "mouseout"
 * events, respectively. To increase the radius at which the point behavior can
 * be applied, specify an appropriate threshold to the constructor, up to
 * <tt>Infinity</tt>.
 *
 * <p>By default, the standard Cartesian distance is computed. However, with
 * some visualizations it is desirable to consider only a single dimension, such
 * as the <i>x</i>-dimension for an independent variable. In this case, the
 * collapse parameter can be set to collapse the <i>y</i> dimension:
 *
 * <pre>    .event("mousemove", pv.Behavior.point(Infinity).collapse("y"))</pre>
 *
 * <p>This behavior only listens to mousemove events on the assigned panel,
 * which is typically the root panel. The behavior will search recursively for
 * descendant marks to point. If the mouse leaves the assigned panel, the
 * behavior no longer receives mousemove events; an unpoint psuedo-event is
 * automatically dispatched to unpoint any pointed mark. Marks may be re-pointed
 * when the mouse reenters the panel.
 *
 * <p>Panels have transparent fill styles by default; this means that panels may
 * not receive the initial mousemove event to start pointing. To fix this
 * problem, either given the panel a visible fill style (such as "white"), or
 * set the <tt>events</tt> property to "all" such that the panel receives events
 * despite its transparent fill.
 *
 * <p>Note: this behavior does not currently wedge marks.
 *
 * @extends pv.Behavior
 *
 * @param {object|number} [keyArgs] the fuzzy radius threshold in pixels, or an 
 * optional keyword arguments object.
 * @param {boolean} [keyArgs.radius=33] the fuzzy radius threshold in pixels
 * @param {boolean} [keyArgs.radiusIn=33] the fuzzy radius threshold in pixels 
 *   that wins over a pointer that is <i>inside</i> an element's area.
 * @param {boolean} [keyArgs.stealClick=false] whether to steal any click event when a point element exists
 * @param {string} [keyArgs.collapse] whether to collapse any of the position components when
 *   determining the fuzzy distance.
 * @see <a href="http://www.tovigrossman.com/papers/chi2005bubblecursor.pdf"
 * >"The Bubble Cursor: Enhancing Target Acquisition by Dynamic Resizing of the
 * Cursor's Activation Area"</a> by T. Grossman &amp; R. Balakrishnan, CHI 2005.
 */
pv.Behavior.point = function(keyArgs) {
    var unpoint, // the current pointer target
        collapse = null, // dimensions to collapse
        stealClick = !!pv.get(keyArgs, 'stealClick', false),
        k = {
            x: 1, // x-dimension cost scale
            y: 1  // y-dimension cost scale
        },
        pointingPanel = null, 
        
        r2 = (function(r) {
                if(r != null) {
                    if(typeof r === 'object')      r = pv.get(r, 'radius');
                    else if(typeof r === 'string') r = +r;
                    else if(typeof r !== 'number') r = null;
                }
                return (r == null || isNaN(r) || r <= 0) 
                    ? 900
                    : (isFinite(r) ? (r * r) : r);
            }(arguments.length ? keyArgs : null)),

        // Minimum distance for a non-inside be chosen over an inside.
        r2Inside = (function() {
                var r = pv.get(keyArgs, 'radiusIn');
                if(typeof r === 'string')      r = +r;
                else if(typeof r !== 'number') r = null;

                return (r == null || isNaN(r) || r <= 0) 
                    ? (isFinite(r2) ? (r2 / 8) : 1)
                    : (isFinite(r)  ? (r * r ) : r);
            }());

    /** @private 
     * Search for the mark, 
     * that has a point handler and 
     * that is "closest" to the mouse. 
     */
    function searchSceneChildren(scene, result) {
        if(scene.visible){
            for(var i = scene.children.length - 1 ; i >= 0; i--) {
                searchScenes(scene.children[i], result);
            }
        }
    }
  
    function searchScenes(scenes, result){
        var mark = scenes.mark;
        if (mark.type === 'panel') {
            mark.scene = scenes;
            try{
                for (var j = scenes.length - 1 ; j >= 0; j--) {
                    mark.index = j;
                    searchSceneChildren(scenes[j], result);
                }
            } finally {
                delete mark.scene;
                delete mark.index;
            }
        } else if (mark.$handlers.point) {
            var mouse = mark.mouse();
            for (var j = scenes.length - 1 ; j >= 0; j--) {
                if(isSceneVisible(scenes, j)){
                    evalScene(scenes, j, mouse, result);
                }
            }
        }
    }
  
    function isSceneVisible(scenes, index){
        var s = scenes[index];
        if(!s.visible){
            return false;
        }
      
        var ps = scenes.mark.properties;
        if(!ps.fillStyle && !ps.strokeStyle){
            return true;
        }
      
        if(ps.fillStyle  && s.fillStyle.opacity >= 0.01){
            return true;
        }
      
        if(ps.strokeStyle && s.strokeStyle.opacity >= 0.01){
            return true;
        }
      
        return false;
    }
  
    function evalScene(scenes, index, mouse, result){
        var s = scenes[index];
      
        var shape = scenes.mark.getShape(scenes, index);
      
        // r = {cost: 123, dist2: 123}
        var r = shape.distance2(mouse, k);
        var inside = shape.containsPoint(mouse);
        var chosen = false;
      
        if(result.inside && !inside){
            // The one inside has an "any distance pass".
            
            // If the one not inside also has "area",
            // then ignore it. Must be inside to compete with an inside one.
            // The one not inside, must be at the minimum distance (r2)
            // or there is no point in choosing it...
            if(shape.hasArea() || r.dist2 > r2Inside){
                // Keep existing
                return;
            }
        } else if(inside && !result.inside){
            // The converse
            if(result.distance <= r2Inside && !result.shape.hasArea()){
                // Keep existing
                return;
            }
            
            // Always prefer an inside one
            chosen = true;
        }
      
        if (chosen || r.cost < result.cost) {
            result.inside   = inside;
            result.distance = r.dist2;
            result.cost     = r.cost;
            result.scenes    = scenes;
            result.index    = index;
            result.shape    = shape;
            
//            logChoice(result);
        }
    }
  
//    function logChoice(point){
//        var pointMark = point.scenes && point.scenes.mark;
//        console.log(
//            "POINT   choosing point mark=" + 
//            (pointMark ? (pointMark.type + " " + point.index) : 'none') + 
//            " inside=" + point.inside + 
//            " dist2="  + point.distance + 
//            " cost="   + point.cost);
//    }
    
    /** @private */
    var counter = 0;
    
    function mousemove(e) {
        var myid = counter++; 
        //console.log("POINT MOUSE MOVE BEG " + myid);
//        
//       try{
            var point = {cost: Infinity, inside: false};
        
            searchSceneChildren(this.scene[this.index], point);
        
            //logChoice(point);
            
            // If the closest mark is far away, clear the current target.
            if (!point.inside && (!isFinite(point.cost) || (point.distance > r2))){
                point = null;
            }
    
            /* Unpoint the old target, if it's not the new target. */
            if (unpoint) {
                if (point && 
                    (unpoint.scenes == point.scenes) && 
                    (unpoint.index == point.index)) {
                    return;
                }
      
                pv.Mark.dispatch("unpoint", unpoint.scenes, unpoint.index, e);
            }

            unpoint = point;
    
            /* Point the new target, if there is one. */
            if(point) {
                pv.Mark.dispatch("point", point.scenes, point.index, e);

                // Initialize panel
                // Unpoint when the mouse leaves the pointing panel
                if(!pointingPanel && this.type === 'panel') {
                    
                    pointingPanel = this;
                    pointingPanel.event('mouseout', function(){
                        var ev = arguments[arguments.length - 1];
                        mouseout.call(pointingPanel.scene.$g, ev);
                    });
                    
                    if(stealClick){
                        pointingPanel.addEventInterceptor('click', eventInterceptor);
                    }
                } else {
                    pv.listen(this.root.canvas(), 'mouseout', mouseout);
                }
            }
//        } finally{
//            //console.log("POINT MOUSE MOVE END " + myid);
//        }
    }

    /** @private */
    function mouseout(e) {
        if (unpoint && !pv.ancestor(this, e.relatedTarget)) {
            pv.Mark.dispatch("unpoint", unpoint.scenes, unpoint.index, e);
            unpoint = null;
        }
    }

    /**
     * Intercepts click events and redirects them 
     * to the pointed by element, if any.
     * 
     * @returns {boolean|array} 
     * <tt>false</tt> to indicate that the event is handled,
     * otherwise, an event handler info array: [handler, type, scenes, index, ev].
     * 
     * @private
     */
    function eventInterceptor(type, ev) {
        if(unpoint) {
            var scenes  = unpoint.scenes,
                handler = scenes.mark.$handlers[type];
            if(handler) return [handler, scenes, unpoint.index, ev];
        }
        // Let event be handled normally
    }
    
    /**
     * Sets or gets the collapse parameter. By default, the standard Cartesian
     * distance is computed. However, with some visualizations it is desirable to
     * consider only a single dimension, such as the <i>x</i>-dimension for an
     * independent variable. In this case, the collapse parameter can be set to
     * collapse the <i>y</i> dimension:
     *
     * <pre>    .event("mousemove", pv.Behavior.point(Infinity).collapse("y"))</pre>
     *
     * @function
     * @returns {pv.Behavior.point} this, or the current collapse parameter.
     * @name pv.Behavior.point.prototype.collapse
     * @param {string} [x] the new collapse parameter
     */
    mousemove.collapse = function(x) {
        if (arguments.length) {
            collapse = String(x);
            switch (collapse) {
                case "y": k.x = 1; k.y = 0; break;
                case "x": k.x = 0; k.y = 1; break;
                default:  k.x = 1; k.y = 1; break;
            }
            return mousemove;
        }
        return collapse;
    };
    
    if(keyArgs && keyArgs.collapse !== null) mousemove.collapse(keyArgs.collapse);
    keyArgs = null;

    return mousemove;
};
