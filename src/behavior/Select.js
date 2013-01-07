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
 * 
 * @constructor
 * @param {object}  [keyArgs] keyword arguments object  
 * @param {boolean} [keyArgs.autoRefresh=true] whether to render the selection mark on mouse moves
 * @param {boolean} [keyArgs.datumIsRect=true] whether the datum is where the selection rectangle coordinates are stored.
 * When <tt>false</tt>, the selection rectangle is  
 * published in a property created on the panel mark: 'selectionRect',
 * of type {@link pv.Shape.Rect}.
 * 
 * @see pv.Behavior.drag
 */
 pv.Behavior.select = function(keyArgs){
  var scene, // scene context
      index, // scene context
      m1,     // initial mouse position
      mprev,  // the mouse position of the previous event (mouse down or mouse move)
      events, // event registrations held during each selection
      r,      // current selection rect
      downElem,
      cancelClick,
      inited;

    // Redraw mark on mouse move - default is the same as the initial pv.Behavior.select
    var autoRefresh = def.get(keyArgs, 'autoRefresh', true);
    
    // Whether the datum is where the selection rect coordinates are stored
    var datumIsRect = def.get(keyArgs, 'datumIsRect', true);
    
    /** @private protovis mark event handler */
    function mousedown(d) {
      var ev = arguments[arguments.length - 1]; // last argument
      
      downElem = ev.target;
      cancelClick = false;
      index = this.index;
      scene = this.scene;
      m1 = this.mouse();
      
      // Initialize
      if(!inited){
          inited = true;
          this.addEventInterceptor('click', eventInterceptor, /*before*/true);
      }
      
      // Add event handlers to follow the selection.
      // These are unregistered on mouse up.
      if(!events){
          var root = this.root.scene.$g;
          events = [
              // Attaching events to the canvas (instead of only to the document)
              // allows canceling the bubbling of the events before they 
              // reach the handlers of ascendant elements (of canvas).
              [root,     'mousemove', pv.listen(root, 'mousemove', mousemove)],
              [root,     'mouseup',   pv.listen(root, 'mouseup',   mouseup  )],
              
              // It is still necessary to receive events
              // that are sourced outside the canvas
              [document, 'mousemove', pv.listen(document, 'mousemove', mousemove)],
              [document, 'mouseup',   pv.listen(document, 'mouseup',   mouseup  )]
          ];
      }
      
      if(datumIsRect){
          r = d;
          r.x = m1.x;
          r.y = m1.y;
          r.dx = r.dy = 0;
      } else {
          mprev = m1;
          this.selectionRect = r = new pv.Shape.Rect(m1.x, m1.y, 0, 0);
      }

      pv.Mark.dispatch('selectstart', scene, index, ev);
    }
    
    /** @private DOM event handler */
    function mousemove(ev) {
        if (!scene) { return; }
      
        // Prevent the event from bubbling off the canvas 
        // (if being handled by the root)
        ev.stopPropagation();
      
        scene.mark.context(scene, index, function() {
            // this === scene.mark
            var m2 = this.mouse();
      
            if(datumIsRect){
                r.x = Math.max(0, Math.min(m1.x, m2.x));
                r.y = Math.max(0, Math.min(m1.y, m2.y));
                r.dx = Math.min(this.width(), Math.max(m2.x, m1.x)) - r.x;
                r.dy = Math.min(this.height(), Math.max(m2.y, m1.y)) - r.y;
            } else {
                if(mprev && m2.distance2(mprev).dist2 <= 2){
                    return;
                }
      
                mprev = m2;
          
                var x = m1.x;
                var y = m1.y;
                this.selectionRect = r = new pv.Shape.Rect(x, y, m2.x - x, m2.y - y);
            }
      
            if(autoRefresh){
                this.render();
            }
      
            pv.Mark.dispatch('select', scene, index, ev);
        });
    }   

    /** @private DOM event handler */
    function mouseup(ev) {
        if (!scene) { return; }
      
        // A click event is generated whenever
        // the element where the mouse goes down
        // is the same element of where the mouse goes up.
        // We will try to intercept the generated click event and swallow it,
        // when a selection has occurred.
        cancelClick = (downElem === ev.target) && (r.dx > 0 || r.dy > 0);
        if(!cancelClick){
            downElem = null;
        }
      
        // Prevent the event from bubbling off the canvas 
        // (if being handled by the root)
        ev.stopPropagation();
      
        // Unregister events
        if(events){
            events.forEach(function(registration){
                pv.unlisten.apply(pv, registration);
            });
            events = null;
        }
      
        pv.Mark.dispatch('selectend', scene, index, ev);
      
        // Cleanup
        if(!datumIsRect){
            scene.mark.selectionRect = mprev = null;
        }
      
        scene = index = m1 = r = null;
    }

    /**
     * Intercepts click events and, 
     * if they were consequence
     * of a mouse down and up of a selection,
     * cancels them.
     * 
     * @returns {boolean|array} 
     * <tt>false</tt> to indicate that the event is handled,
     * otherwise, an event handler info array: [handler, type, scenes, index, ev].
     * 
     * @private
     */
    function eventInterceptor(type, ev){
        if(cancelClick && downElem === ev.target){
            // Event is handled
            cancelClick = false;
            downElem = null;
            return false;
        }
        
        // Let event be handled normally
    }

    return mousedown;
};
  
