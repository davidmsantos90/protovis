 pv.Behavior.dragBase = function(shared){
    var events, // event registrations held during each selection
        downElem,
        cancelClick,
        inited,
        autoRender = true,
        positionConstraint,
        drag;
    
    shared.autoRender = true;
    shared.positionConstraint = null;
    
    /** @private protovis mark event handler */
    function mousedown(d) {
        // Initialize
        if(!inited){
            inited = true;
            this.addEventInterceptor('click', eventInterceptor, /*before*/true);
        }
        
        // Add event handlers to follow the drag.
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
        
        var ev = arguments[arguments.length - 1]; // last argument
        downElem = ev.target;
        cancelClick = false;
        
        // Prevent the event from bubbling off the canvas 
        // (if being handled by the root)
        ev.stopPropagation();
        
        // --------------
        
        ev = pv.extend(ev);
        
        var m1    = this.mouse();
        var scene = this.scene;
        var index = this.index;
        
        drag = 
        scene[index].drag = 
        ev.drag = {
            phase: 'start',
            m:     m1,    // current relevant mouse position
            m1:    m1,    // the mouse position of the mousedown
            m2:    null,  // the mouse position of the current/last mousemove
            d:     d,     // the datum in mousedown
            scene: scene, // scene context
            index: index  // scene index
        };
        
        shared.dragstart.call(this, ev);
    }
    
    /** @private DOM event handler */
    function mousemove(ev) {
        if (!drag) { return; }
        
        drag.phase = 'move';
        
        // Prevent the event from bubbling off the canvas 
        // (if being handled by the root)
        ev.stopPropagation();
        
        ev = pv.extend(ev);
        ev.drag = drag;
        
        // In the context of the mousedown scene
        var scene = drag.scene;
        scene.mark.context(scene, drag.index, function() {
            // this === scene.mark
            var mprev = drag.m2 || drag.m1;
            
            var m2 = this.mouse();
            if(mprev && m2.distance2(mprev).dist2 <= 2){
                return;
            }
            
            drag.m = drag.m2 = m2;
            
            shared.drag.call(this, ev);
            
            // m2 may have changed
        });
    }

    /** @private DOM event handler */
    function mouseup(ev) {
        if (!drag) { return; }
        
        drag.phase = 'end';
        
        var m2 = drag.m2;
        
        // A click event is generated whenever
        // the element where the mouse goes down
        // is the same element of where the mouse goes up.
        // We will try to intercept the generated click event and swallow it,
        // when some selection has occurred.
        var isDrag = m2 && drag.m1.distance2(m2).dist2 > 0.1;
        drag.canceled = !isDrag;
        
        cancelClick = isDrag && (downElem === ev.target);
        if(!cancelClick){
            downElem = null;
        }
        
        // Prevent the event from bubbling off the canvas 
        // (if being handled by the root)
        ev.stopPropagation();
        
        ev = pv.extend(ev);
        ev.drag = drag;
        
        // Unregister events
        if(events){
            events.forEach(function(registration){
                pv.unlisten.apply(pv, registration);
            });
            events = null;
        }
        
        var scene = drag.scene;
        var index = drag.index;
        try{
            scene.mark.context(scene, index, function() {
                shared.dragend.call(this, ev);
            });
        } finally {
            drag = null;
            delete scene[index].drag;
        }
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
    

    /**
     * Whether to automatically render the mark when appropriate.
     * 
     * @function
     * @returns {pv.Behavior.dragBase | boolean} this, or the current autoRender parameter.
     * @name pv.Behavior.dragBase.prototype.autoRender
     * @param {string} [_] the new autoRender parameter
     */
    mousedown.autoRender = function(_) {
        if (arguments.length) {
            shared.autoRender = !!_;
            return mousedown;
        }
        
        return shared.autoRender;
    };
    
    /**
     * Gets or sets the positionConstraint parameter.
     * 
     * A function that given a drag object
     * can change its property <tt>m</tt>, 
     * containing a vector with the desired mouse position.
     *  
     * @function
     * @returns {pv.Behavior.dragBase | function} this, or the current positionConstraint parameter.
     * @name pv.Behavior.dragBase.prototype.positionConstraint
     * @param {function} [_] the new positionConstraint parameter
     */
    mousedown.positionConstraint = function(_) {
        if (arguments.length) {
            shared.positionConstraint = _;
            return mousedown;
        }
        
        return shared.positionConstraint;
    };
    
    return mousedown;
};
  
