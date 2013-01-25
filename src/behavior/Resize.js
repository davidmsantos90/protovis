/**
 * Returns a new resize behavior to be registered on mousedown events.
 *
 * @class Implements interactive resizing of a selection starting with mousedown
 * events. Register this behavior on selection handles that should be resizeable
 * by the user, such for brushing and linking. This behavior can be used in
 * tandom with {@link pv.Behavior.select} and {@link pv.Behavior.drag} to allow
 * the selected region to be selected and dragged interactively.
 *
 * <p>After the initial mousedown event is triggered, this behavior listens for
 * mousemove and mouseup events on the window. This allows resizing to continue
 * even if the mouse temporarily leaves the assigned panel, or even the root
 * panel.
 *
 * <p>This behavior requires that the data associated with the mark being
 * resized have <tt>x</tt>, <tt>y</tt>, <tt>dx</tt> and <tt>dy</tt> attributes
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
 * size by updating the assigned panel's underlying data. Note that if the
 * positional properties are defined with bottom and right (rather than top and
 * left), the resize behavior will be inverted, which will confuse users!
 *
 * <p>The resize behavior is bounded by the assigned mark's enclosing panel; the
 * positional attributes are clamped such that the selection does not extend
 * outside the panel's bounds.
 *
 * <p>The mark being resized is automatically re-rendered for each mouse event
 * as part of the resize operation. This behavior may be enhanced in the future
 * to allow more flexible configuration. In some cases, such as with parallel
 * coordinates, resizing the selection may cause related marks to change, in
 * which case additional marks may also need to be rendered. This can be
 * accomplished by listening for the select psuedo-events:<ul>
 *
 * <li>resizestart (on mousedown)
 * <li>resize (on mousemove)
 * <li>resizeend (on mouseup)
 *
 * </ul>For example, to render the parent panel while resizing, thus
 * re-rendering all sibling marks:
 *
 * <pre>    .event("mousedown", pv.Behavior.resize("left"))
 *     .event("resize", function() this.parent)</pre>
 *
 * This behavior may be enhanced in the future to allow more flexible
 * configuration of the selection behavior.
 *
 * @extends pv.Behavior
 * @see pv.Behavior.select
 * @see pv.Behavior.drag
 */
pv.Behavior.resize = function(side) {
    var max;
    var preserveOrtho = false;
    
    var isLeftRight = (side === 'left' || side === 'right');
    
    // Executed in context of initial mark scene
    var shared = {
        dragstart: function(ev){
            var drag = ev.drag;
            drag.type = 'resize';
            
            var m1 = drag.m1;
            var r  = drag.d;
            r.drag = drag;
            
            // Fix the position of m1 to be the opposite side,
            // the one whose position is fixed during resizing
            switch(side) {
                case "left":   m1.x = r.x + r.dx; break;
                case "right":  m1.x = r.x;        break;
                case "top":    m1.y = r.y + r.dy; break;
                case "bottom": m1.y = r.y;        break;
            }
            
            // Capture parent's dimensions once
            var parent = this.parent;
            max = {
                x: parent.width(),
                y: parent.height()
            };
            
            pv.Mark.dispatch("resizestart", drag.scene, drag.index, ev);
        },
        
        drag: function(ev){
            var drag = ev.drag;
            
            var m1 = drag.m1;
            var constraint = shared.positionConstraint;
            if(constraint){
                drag.m = drag.m.clone();
                constraint(drag);
            }
            
            var m  = drag.m;
            var r  = drag.d;
            var parent = this.parent;
            
            if(!preserveOrtho || isLeftRight){
                r.x  = Math.max(0,     Math.min(m1.x, m.x));
                r.dx = Math.min(max.x, Math.max(m.x,  m1.x)) - r.x;
            }
            
            if(!preserveOrtho || !isLeftRight){
                r.y  = Math.max(0,     Math.min(m1.y, m.y));
                r.dy = Math.min(max.y, Math.max(m.y, m1.y)) - r.y;
            }
            
            if(shared.autoRender){
                this.render();
            }
            
            pv.Mark.dispatch("resize", drag.scene, drag.index, ev);
        },
        
        dragend: function(ev){
            var drag = ev.drag;
            
            max = null;
            try {
                pv.Mark.dispatch('resizeend', drag.scene, drag.index, ev);
            } finally {
                var r = drag.d;
                delete r.drag;
            }
        }
    };

    var mousedown = pv.Behavior.dragBase(shared);
    
    /**
     * Sets or gets the preserveOrtho.
     * 
     * When <tt>true</tt>
     * doesn't update coordinates orthogonal to the behaviou's side.
     * The default value is <tt>false</tt>.
     *
     * @function
     * @returns {pv.Behavior.resize | boolean} this, or the current preserveOrtho parameter.
     * @name pv.Behavior.resize.prototype.preserveOrtho
     * @param {boolean} [_] the new preserveOrtho parameter
     */
    mousedown.preserveOrtho = function(_) {
        if (arguments.length){
            preserveOrtho = !!_;
            return mousedown;
        }
        return preserveOrtho;
    };
    
    return mousedown;
};
