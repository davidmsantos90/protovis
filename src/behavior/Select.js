/**
 * Returns a new select behavior to be registered on mousedown events.
 *
 * @class Implements interactive selecting starting with mousedown events.
 * Register this behavior on panels that should be selectable by the user, such
 * for brushing and linking. This behavior can be used in tandom with
 * {@link pv.Behavior.drag} to allow the selected region to be dragged
 * interactively.
 *
 * <p>After the initial mousedown event is triggered, this behavior listens for
 * mousemove and mouseup events on the window. This allows selecting to continue
 * even if the mouse temporarily leaves the assigned panel, or even the root
 * panel.
 *
 * <p>This behavior requires that the data associated with the mark being
 * dragged have <tt>x</tt>, <tt>y</tt>, <tt>dx</tt> and <tt>dy</tt> attributes
 * that correspond to the mark's location and dimensions in pixels. The mark's
 * positional properties are not set directly by this behavior; instead, the
 * positional properties should be defined as:
 *
 * <pre>    .left(function(d) d.x)
 *     .top(function(d) d.y)
 *     .width(function(d) d.dx)
 *     .height(function(d) d.dy)</pre>
 *
 * Thus, the behavior does not resize the mark directly, but instead updates the
 * selection by updating the assigned panel's underlying data. Note that if the
 * positional properties are defined with bottom and right (rather than top and
 * left), the drag behavior will be inverted, which will confuse users!
 *
 * <p>The select behavior is bounded by the assigned panel; the positional
 * attributes are clamped such that the selection does not extend outside the
 * panel's bounds.
 *
 * <p>The panel being selected is automatically re-rendered for each mouse event
 * as part of the drag operation. This behavior may be enhanced in the future to
 * allow more flexible configuration of select behavior. In some cases, such as
 * with parallel coordinates, making a selection may cause related marks to
 * change, in which case additional marks may also need to be rendered. This can
 * be accomplished by listening for the select pseudo-events:<ul>
 *
 * <li>selectstart (on mousedown)
 * <li>select (on mousemove)
 * <li>selectend (on mouseup)
 *
 * </ul>For example, to render the parent panel while selecting, thus
 * re-rendering all sibling marks:
 *
 * <pre>    .event("mousedown", pv.Behavior.drag())
 *     .event("select", function() this.parent)</pre>
 *
 * This behavior may be enhanced in the future to allow more flexible
 * configuration of the selection behavior.
 *
 * @extends pv.Behavior
 * @see pv.Behavior.drag
 */
 pv.Behavior.select = function(){
    var collapse = null; // dimensions to collapse
    var kx = 1; // x-dimension 1/0
    var ky = 1; // y-dimension 1/0
    var preserveLength = false;
    
    // Executed in context of initial mark scene
    var shared = {
        dragstart: function(ev){
            var drag = ev.drag;
            drag.type = 'select';
            drag.dxmin = 0;
            drag.dymin = 0;
            
            var r  = drag.d;
            r.drag = drag;
            
            drag.max = {
                x: this.width(),
                y: this.height()
            };
            
            drag.min = {
                x: 0,
                y: 0
            };
                
            var constraint = shared.positionConstraint;
            if(constraint){
                drag.m = drag.m.clone();
                constraint(drag);
            }
            
            var m = drag.m;
            if(kx){
                r.x = shared.bound(m.x, 'x');
                if(!preserveLength) r.dx = Math.max(0, drag.dxmin);
            }
            
            if(ky){
                r.y = shared.bound(m.y, 'y');
                if(!preserveLength) r.dy = Math.max(0, drag.dymin);
            }
            
            pv.Mark.dispatch('selectstart', drag.scene, drag.index, ev);
        },
        
        drag: function(ev){
            var drag = ev.drag;
            var m1 = drag.m1;
            var r  = drag.d;
            
            drag.max.x = this.width();
            drag.max.y = this.height();
            
            var constraint = shared.positionConstraint;
            if(constraint){
                drag.m = drag.m.clone();
                constraint(drag);
            }
            
            var m = drag.m;
            
            if(kx){
                var bx = Math.min(m1.x, m.x);
                bx  = shared.bound(bx, 'x');
                r.x = bx;
                
                if(!preserveLength){
                    var ex = Math.max(m.x,  m1.x);
                    ex = shared.bound(ex, 'x');
                    r.dx = Math.max(0, drag.dxmin, ex - bx);
                }
            }
            
            if(ky){
                var by = Math.min(m1.y, m.y);
                by  = shared.bound(by, 'y');
                r.y = by;
                
                if(!preserveLength){
                    var ey = Math.max(m.y,  m1.y);
                    ey = shared.bound(ey, 'y');
                    r.dy = Math.max(0, drag.dymin, ey - by);
                }
            }
            
            if(shared.autoRender){
                this.render();
            }
      
            pv.Mark.dispatch('select', drag.scene, drag.index, ev);
        },
        
        dragend: function(ev){
            var drag = ev.drag;
            try {
                pv.Mark.dispatch('selectend', drag.scene, drag.index, ev);
            } finally {
                var r = drag.d;
                delete r.drag;
            }
        }
    };
    
    var mousedown = pv.Behavior.dragBase(shared);
    
    /**
     * Sets or gets the collapse parameter.
     * By default, the selection rectangle is sensitive to both dimensions.
     * However, with some visualizations it is desirable to
     * consider only a single dimension, such as the <i>x</i>-dimension for an
     * independent variable. In this case, the collapse parameter can be set to
     * collapse the <i>y</i> dimension:
     *
     * <pre>    .event("mousedown", pv.Behavior.select().collapse("y"))</pre>
     *
     * @function
     * @returns {pv.Behavior.select} this, or the current collapse parameter.
     * @name pv.Behavior.select.prototype.collapse
     * @param {string} [x] the new collapse parameter
     */
    mousedown.collapse = function(x) {
      if (arguments.length) {
        collapse = String(x);
        switch (collapse) {
          case "y": kx = 1; ky = 0; break;
          case "x": kx = 0; ky = 1; break;
          default:  kx = 1; ky = 1; break;
        }
        return mousedown;
      }
      return collapse;
    };
    
    mousedown.preserveLength = function(_) {
      if (arguments.length) {
        preserveLength = !!_;
        return mousedown;
      }
       return preserveLength;
    };
    
    return mousedown;
};
