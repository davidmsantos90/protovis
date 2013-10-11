pv.Transition = function(mark) {
  var that = this,
      ease = pv.ease("cubic-in-out"),
      duration = 250,
      timer,
      onEndCallback,
      cleanedup;

  var interpolated = {
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    width: 1,
    height: 1,
    innerRadius: 1,
    outerRadius: 1,
    radius: 1,
    shapeRadius: 1,
    shapeSize: 1,
    startAngle: 1,
    endAngle: 1,
    angle: 1,
    fillStyle: 1,
    strokeStyle: 1,
    lineWidth: 1,
    eccentricity: 1,
    tension: 1,
    textAngle: 1,
    textStyle: 1,
    textMargin: 1
  };

  var defaults = new pv.Transient();

  /** @private */
  function ids(scene) {
    var map = {};
    var i = scene.length;
    while(i--) {
      var s  = scene[i];
      var id = s.id;
      if(id) { map[id] = s; }
    }
    return map;
  }

  /** @private */
  function interpolateProperty(list, name, before, after) {
    var f;
    if(name in interpolated) {
      var i = pv.Scale.interpolator(before[name], after[name]);
      f = function(t) {
          before[name] = i(t); 
      };
    } else {
      f = function(t) {
          if(t > .5) {
              before[name] = after[name];
          }
      };
    }
    f.next = list.head;
    list.head = f;
  }

  /** @private */
  function interpolateInstance(list, before, after) {
    for (var name in before) {
      if (name == "children") continue; // not a property
      if (before[name] == after[name]) continue; // unchanged
      interpolateProperty(list, name, before, after);
    }
    if (before.children) {
      for (var j = 0; j < before.children.length; j++) {
        interpolate(list, before.children[j], after.children[j]);
      }
    }
  }

  /** @private */
  function interpolate(list, before, after) {
    var mark = before.mark;
    var beforeById = ids(before); // scene instances with id indexed by id
    var afterById  = ids(after);  // idem
    var beforeInst, afterInst;

    var i = 0;
    var L = before.length;

    // For each BEFORE instance
    for(; i < L; i++) {
      beforeInst = before[i];
      afterInst  = beforeInst.id ? afterById[beforeInst.id] : after[i]; // by id, if available, or by index
      
      beforeInst.index = i;

      // Initially hidden. Handled in the AFTER loop, below.
      if(!beforeInst.visible) { continue; }
      
      // Initially visible.

      // The inexistent or invisible `after` instance is existing.
      if(!(afterInst && afterInst.visible)) {
        var overridenAfterInst = override(before, i, mark.$exit, after);

        /*
         * After the transition finishes, we need to do a little cleanup to
         * ensure that the final state of the scenegraph is consistent with the
         * "after" render. For instances that were removed, we need to remove
         * them from the scenegraph; for instances that became invisible, we
         * need to mark them invisible. See the cleanup method for details.
         */
        beforeInst.transition = afterInst ? 2 : (after.push(overridenAfterInst), 1);

        afterInst = overridenAfterInst;
      }

      interpolateInstance(list, beforeInst, afterInst);
    }
    
    // For each AFTER instance (skipping ones just created),
    //  for which a corresponding `before` instance 
    //  does not exist or is invisible, 
    //  the following creates them, when missing, or overrides them when existing.
    i = 0;
    L = after.length;
    for(; i < L; i++) {
      afterInst  = after[i];
      beforeInst = afterInst.id ? beforeById[afterInst.id] : before[i];
      
      // The inexistent or invisible `before` instance is entering.
      if(!(beforeInst && beforeInst.visible) && afterInst.visible) {
        var overridenBeforeInst = override(after, i, mark.$enter, before);

        if(!beforeInst) {
          // Add overridenBeforeInst to the end of before.
          // This way indexes of existing befores are not changed,
          //  and the result of the above beforeInst assignment will remain the same
          //  for the remaining `i`. This should work if all have ids or if none do.
          before.push(overridenBeforeInst);
        } else { 
          // replace beforeInst with overridenBeforeInst, in `before`.
          before[beforeInst.index] = overridenBeforeInst;
        }

        // beforeInst = overridenBeforeInst;
        
        interpolateInstance(list, overridenBeforeInst, afterInst);
      }
    }
  }

  /**
   * Creates or overrides an instance that 
   * is entering or exiting the stage in an animation.
   * <p>
   * A "before" instance is said to be "entering", 
   * when it does not exist, for a corresponding
   * existing and visible "after" instance, 
   * or if it is invisible.
   * </p>
   * <p>
   * An "after" instance is said to be "exiting",
   * when if does not exist, for a corresponding 
   * existing and visible "before" instance, or if it is invisible.
   * </p>
   *
   * @param {Array}  scene the scene being overriden. A before or after scene.
   * @param {number} index the index of the instance of scene being overriden.
   * @param {pv.Transient} [proto] the transient of the corresponding state: "enter" or "exit".
   * When overriding a before instance, it is the "exit" transient. 
   * When overriding an after instance, it is the "enter" transient.
   * @param {Array}  other the other scene.
   * When overriding a before instance, the corresponding after scene. 
   * When overriding an after instance, the corresponding before scene.
   *
   * @return {object} an overriden scene instance object.
   * @private 
   */
  function override(scene, index, proto, other) {
    var otherInst = pv.extend(scene[index]);
    var m = scene.mark;
    var rs = m.root.scene;

    // Correct the target reference, if this is an anchor.
    // This change affects only the below m.context code.
    // TODO: understand/explain the other.length, below...
    var t;
    if(other.target && (t = other.target[other.length])) {
      scene = pv.extend(scene);
      scene.target = pv.extend(other.target);
      scene.target[index] = t;
    }

    // BIND
    // Determine the set of properties to evaluate.

    // Properties of the transient specified for "entry" or "exit" state.
    // If proto isn't specified use a default transient instance.
    if(!proto) { proto = defaults; }
    var ps        = proto.$properties;    // Do not change!
    var overriden = proto.$propertiesMap; // Idem!!

    // Add to ps all optional properties in binds not in `overriden` properties.
    ps = m.binds.optional
         .filter(function(p) { return !(p.name in overriden); })
         .concat(ps);

    // BUILD
    // Evaluate the properties and update any implied ones.
    // TODO: is it really needed to enter and exit the context per overriden instance?
    //   Could the context be set for the parent scene and only then
    //   change the context for each instance?
    m.context(scene, index, function() {
      this.buildProperties(otherInst, ps);
      this.buildImplied(otherInst);
    });

    // Restore the root scene. This should probably be done by context().
    m.root.scene = rs;

    return otherInst;
  }

  /** @private */
  function cleanup(scene) {
    if(!cleanedup) {
      cleanedup = true;

      for(var i = 0, j = 0; i < scene.length; i++) {
        var s = scene[i];
        if(s.transition != 1) {
          scene[j++] = s;
          if(s.transition == 2) s.visible = false;
          if(s.children) s.children.forEach(cleanup);
        }
      }
      scene.length = j;
    }
  }

  that.ease = function(x) {
    return arguments.length
        ? (ease = typeof x == "function" ? x : pv.ease(x), that)
        : ease;
  };

  that.duration = function(x) {
    return arguments.length
        ? (duration = Number(x), that)
        : duration;
  };

  that.start = function(onEnd) {
    // TODO allow partial rendering
    if(mark.parent) { throw new Error("Animated partial rendering is not supported."); }
    
    onEndCallback = onEnd;

    var root = mark.root;

    // TODO allow parallel and sequenced transitions
    if(root.$transition) {
      try { root.$transition.stop(); } catch(ex) { return doEnd(false); }
    }

    // ---------------

    var list, start;
    root.$transition = that;

    // TODO clearing the scene like this forces total re-build
    var before = mark.scene;
    mark.scene = null;
    var i0 = pv.Mark.prototype.index;
    try {
        mark.bind();
        mark.build();
        
        var after = mark.scene;
        mark.scene = before;
        pv.Mark.prototype.index = i0;
    
        start = Date.now();
        list = {};
        interpolate(list, before, after);
    } catch(ex) {
        pv.Mark.prototype.index = i0; // JIC
        return doEnd(false);
    }
    
    if(!list.head) { return doEnd(true); }
    
    var advance = function() {
      var t = Math.max(0, Math.min(1, (Date.now() - start) / duration)),
          e = ease(t);
      
      /* Advance every property of every mark */
      var i = list.head;
      do { i(e); } while((i = i.next));
      
      if(t === 1) {
        cleanup(mark.scene);
        pv.Scene.updateAll(before);
        doEnd(true);
      } else {
        pv.Scene.updateAll(before);
      }
    };

    timer = setInterval(function() {
      try { advance(); } catch(ex) { doEnd(false); }
    }, 24);
  }; // end that.start

  that.stop = function() { doEnd(true); };

  function doEnd(success) {
    var started = (mark.root.$transition === that);
    if(started) { mark.root.$transition = null; }
    
    if(timer != null) {
      clearInterval(timer);
      timer = null;
    }

    if(started) { cleanup(mark.scene); }

    if(onEndCallback) {
      var cb = onEndCallback;
      onEndCallback = null;
      cb(success);
    }

    // Only useful when it fails synchronous in #start.
    return success;
  }
};
