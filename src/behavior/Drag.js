/**
 * Returns a new drag behavior to be registered on mousedown events.
 *
 * @class Implements interactive dragging starting with mousedown events.
 * Register this behavior on marks that should be draggable by the user, such as
 * the selected region for brushing and linking. This behavior can be used in
 * tandom with {@link pv.Behavior.select} to allow the selected region to be
 * dragged interactively.
 *
 * <p>After the initial mousedown event is triggered, this behavior listens for
 * mousemove and mouseup events on the window. This allows dragging to continue
 * even if the mouse temporarily leaves the mark that is being dragged, or even
 * the root panel.
 *
 * <p>This behavior requires that the data associated with the mark being
 * dragged have <tt>x</tt> and <tt>y</tt> attributes that correspond to the
 * mark's location in pixels. The mark's positional properties are not set
 * directly by this behavior; instead, the positional properties should be
 * defined as:
 *
 * <pre>    .left(function(d) d.x)
 *     .top(function(d) d.y)</pre>
 *
 * Thus, the behavior does not move the mark directly, but instead updates the
 * mark position by updating the underlying data. Note that if the positional
 * properties are defined with bottom and right (rather than top and left), the
 * drag behavior will be inverted, which will confuse users!
 *
 * <p>The drag behavior is bounded by the parent panel; the <tt>x</tt> and
 * <tt>y</tt> attributes are clamped such that the mark being dragged does not
 * extend outside the enclosing panel's bounds. To facilitate this, the drag
 * behavior also queries for <tt>dx</tt> and <tt>dy</tt> attributes on the
 * underlying data, to determine the dimensions of the bar being dragged. For
 * non-rectangular marks, the drag behavior simply treats the mark as a point,
 * which means that only the mark's center is bounded.
 *
 * <p>The mark being dragged is automatically re-rendered for each mouse event
 * as part of the drag operation. In addition, a <tt>fix</tt> attribute is
 * populated on the mark, which allows visual feedback for dragging. For
 * example, to change the mark fill color while dragging:
 *
 * <pre>    .fillStyle(function(d) d.fix ? "#ff7f0e" : "#aec7e8")</pre>
 *
 * In some cases, such as with network layouts, dragging the mark may cause
 * related marks to change, in which case additional marks may also need to be
 * rendered. This can be accomplished by listening for the drag
 * psuedo-events:<ul>
 *
 * <li>dragstart (on mousedown)
 * <li>drag (on mousemove)
 * <li>dragend (on mouseup)
 *
 * </ul>For example, to render the parent panel while dragging, thus
 * re-rendering all sibling marks:
 *
 * <pre>    .event("mousedown", pv.Behavior.drag())
 *     .event("drag", function() this.parent)</pre>
 *
 * This behavior may be enhanced in the future to allow more flexible
 * configuration of drag behavior.
 *
 * @extends pv.Behavior
 * @see pv.Behavior
 * @see pv.Behavior.select
 * @see pv.Layout.force
 */
pv.Behavior.drag = function() {
    var collapse = null; // dimensions to collapse
    var kx = 1; // x-dimension 1/0
    var ky = 1; // y-dimension 1/0
    
    var v1;  // initial mouse-particle offset
    var max;
    
    // Executed in context of initial mark scene
    var shared = {
        dragstart: function(ev){
            var drag = ev.drag;
            drag.type = 'drag';
            
            var p    = drag.d; // particle being dragged
            var fix  = pv.vector(p.x, p.y);
            
            p.fix  = fix;
            p.drag = drag;
            
            v1 = fix.minus(drag.m1);
            
            var parent = this.parent;
            max = {
               x: parent.width()  - (p.dx || 0),
               y: parent.height() - (p.dy || 0)
            };
            
            if(shared.autoRender){
                this.render();
            }
            
            pv.Mark.dispatch("dragstart", drag.scene, drag.index, ev);
        },
        
        drag: function(ev){
            var drag = ev.drag;
            var m2   = drag.m2;
            var p    = drag.d;
            
            drag.m = v1.plus(m2);
            
            var constraint = shared.positionConstraint;
            if(constraint){
                constraint(drag);
            }
            
            var m = drag.m;
            if(kx){
                p.x = p.fix.x = Math.max(0, Math.min(m.x, max.x));
            }
            
            if(ky){
                p.y = p.fix.y = Math.max(0, Math.min(m.y, max.y));
            }
            
            if(shared.autoRender){
                this.render();
            }
            
            pv.Mark.dispatch("drag", drag.scene, drag.index, ev);
        },
        
        dragend: function(ev){
            var drag = ev.drag;
            var p    = drag.d;
            
            p.fix = null; // pv compatibility
            v1 = null;
             
            if(shared.autoRender){
                this.render();
            }
            
            try {
                pv.Mark.dispatch('dragend', drag.scene, drag.index, ev);
            } finally {
                delete p.drag;
            }
        }
    };
    
    var mousedown = pv.Behavior.dragBase(shared);
    
    /**
     * Sets or gets the collapse parameter.
     * By default, dragging is sensitive to both dimensions.
     * However, with some visualizations it is desirable to
     * consider only a single dimension, such as the <i>x</i>-dimension for an
     * independent variable. In this case, the collapse parameter can be set to
     * collapse the <i>y</i> dimension:
     *
     * <pre>    .event("mousedown", pv.Behavior.drag().collapse("y"))</pre>
     *
     * @function
     * @returns {pv.Behavior.drag} this, or the current collapse parameter.
     * @name pv.Behavior.drag.prototype.collapse
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
    
    return mousedown;
};
