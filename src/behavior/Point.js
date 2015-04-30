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
 * behavior no longer receives mousemove events; an unpoint pseudo-event is
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
 * @param {number} [keyArgs.radius=30] the fuzzy radius threshold in pixels.
 * @param {number} [keyArgs.radiusHyst=0] the minimum distance in pixels that
 *  the next point must be from the previous one so that it can be chosen.
 * @param {boolean} [keyArgs.stealClick=false] whether to steal any click event when a point element exists
 * @param {boolean} [keyArgs.painted=false] whether to only consider marks with a non-transparent fill or stroke style.
 * @param {string} [keyArgs.collapse] whether to collapse any of the position components when
 *   determining the fuzzy distance.
 * @see <a href="http://www.tovigrossman.com/papers/chi2005bubblecursor.pdf"
 * >"The Bubble Cursor: Enhancing Target Acquisition by Dynamic Resizing of the
 * Cursor's Activation Area"</a> by T. Grossman &amp; R. Balakrishnan, CHI 2005.
 */
pv.Behavior.point = function(keyArgs) {
    if(typeof keyArgs !== 'object') keyArgs = {radius: keyArgs};

    var DEBUG = 0,
        unpoint, // the current pointer target
        collapse = null, // dimensions to collapse
        painted = !!pv.get(keyArgs, 'painted', false),
        stealClick = !!pv.get(keyArgs, 'stealClick',  false),
        k = {
            x: 1, // x-dimension cost scale
            y: 1  // y-dimension cost scale
        },
        pointingPanel = null,

        dist2Max = (function() {
            var r = pv.parseNumNonNeg(pv.get(keyArgs, 'radius'), 30);
            return r * r;
        }()),

        finiteDist2Max = isFinite(dist2Max),

        radiusHyst2 = (function() {
            var r = pv.parseNumNonNeg(pv.get(keyArgs, 'radiusHyst'), 0);
            if(!isFinite(r)) r = 4;
            return r * r;
        } ());

    /** @private 
     * Search for the mark, 
     * that has a point handler and 
     * that is "closest" to the mouse. 
     */
    function searchSceneChildren(scene, curr) {
        if(scene.visible)
            for(var i = scene.children.length - 1 ; i >= 0; i--)
                if(searchScenes(scene.children[i], curr))
                    return true; // stop
    }
  
    function searchScenes(scenes, curr) {
        var mark = scenes.mark,
            isPanel = mark.type === 'panel',
            result, j, isPointingBarrier;

        if(mark.$handlers.point) {
            var mouse = ((isPanel && mark.parent) || mark).mouse(),
                visibility,
                markRMax = mark._pointingRadiusMax,
                markCostMax = markRMax * markRMax;

            j = scenes.length;
            while(j--) {
                if((visibility = sceneVisibility(scenes, j)))
                    if(evalScene(scenes, j, mouse, curr, visibility, markCostMax)) {
                        result = true;
                        break; // stop (among siblings)
                    }
            }    
        }

        if(isPanel) {
            // Give a chance to the panel's children.
            mark.scene = scenes;
            isPointingBarrier = !!(mark.isPointingBarrier && mark.parent);
            try {
                j = scenes.length;
                while(j--) {
                    mark.index = j;
                    if(!isPointingBarrier || mark.getShape(scenes, j).containsPoint(mark.parent.mouse()))
                        if(searchSceneChildren(scenes[j], curr))
                            return true; // stop
                }
            } finally {
                delete mark.scene;
                delete mark.index;
            }
        }

        return result;
    }
  
    function sceneVisibility(scenes, index) {
        var s = scenes[index];
        if(!s.visible) return 0;
        if(!painted  ) return 1;

        // Ignores labels' textStyle.

        var ps = scenes.mark.properties;
        if(!ps.fillStyle && !ps.strokeStyle) return 1;

        var o1 = s.fillStyle   ? s.fillStyle.opacity   : 0,
            o2 = s.strokeStyle ? s.strokeStyle.opacity : 0,
            o  = Math.max(o1, o2);
        return o < 0.02 ? 0 :
               o > 0.98 ? 1 :
               0.5;
    }
  
    function evalScene(scenes, index, mouse, curr, visibility, markCostMax) {
        var shape = scenes.mark.getShape(scenes, index),

            hasArea = shape.hasArea(),

            // 1) "inside" with collapse x/y taken into account (note argument `k` to containsPoint).
            // 1.1) !insideCollapsed => !insideStrict
            // 2) When not collapsed, this is equal to the strict "inside".
            // --
            // When !hasArea Inside <=means=> Coincident.
            // insideStrict > insideCollapsed > outside
            inside = (!shape.containsPoint(mouse, k)            ? 0 : // outside
                      (!collapse || shape.containsPoint(mouse)) ? 2 : // insideStrict
                      1), // insideCollapsed

            // markRadius2Max is only applicable when not strictly inside (inside < 2).
            applyMarkCostMax = isFinite(markCostMax) && inside < 2,

            cand;

        function makeChoice() {
            // Early exit, when no `cand.cost` could ever satisfy markCostMax:
            // markCostMax === 0 => insideStrict !
            if(applyMarkCostMax && markCostMax <= 0) return -1;

            // cand = {cost: 123, dist2: 123}
            cand = shape.distance2(mouse, k);

            if(applyMarkCostMax          && pv.floatLess(markCostMax, cand.cost )) return -2;
            if(finiteDist2Max && !inside && pv.floatLess(dist2Max,    cand.dist2)) return -3;

            // "Inside" comparison is only used on equal `hasArea` situations.
            // Otherwise, the one with no-area and insideCollapsed
            //  would always loose with the one with area and insideStrict.
            if(hasArea === curr.hasArea) {
                if(inside < curr.inside) return -4;
                if(inside > curr.inside) return +1;
                // equal inside
            } else {
                if(collapse) {
                    // A weaker version of the above rule that considers insideStrict = insideCollapsed.
                    // When collapsed, shapes that don't have area,
                    //  are transformed-into/seen-as shapes that do (if of at least two points).
                    // So, they're on a somewhat fairer competition with shapes that naturally have area.

                    // When != weakInsides:
                    if(!inside &&  curr.inside) return -5;
                    if( inside && !curr.inside) return +2;

                    // both have inside === 0
                    // or
                    // both have inside  >  0 (need not be equal)
                }

                if(!hasArea && curr.inside === 2) {
                    // 1) When both inside strict,
                    //  prefer one with no area over one with area.
                    if(inside === 2) return +3;

                    // 2) A non-area, outside, can only steal an insideStrict if
                    // very, very close to it.
                    if(inside === 0 && pv.floatLess(3, cand.cost)) return -6;
                } else if(hasArea && inside === 2) {
                    // Converse of 1)
                    if(curr.inside === 2) return -7;

                    // Converse of 2)
                    if(curr.inside === 0 && pv.floatLess(3, curr.cost)) return +4;
                }
            }

            // "Collapsed aware" distance.
            // Note on the exclusion of the (collapse && inside) case.
            // * When collapse && inside, then both insides are > 0 (see above ifs to conclude it).
            // * In this situation, using dist2 would be misleading,
            //   as it is the distance to the closest point and
            //   not to the closest point on the collapsed direction.
            // * To choose between two equal, non-zero, `inside` values,
            //   what is needed is the distance under the ignored/collapsed dimension;
            //   because the `cost` contains both dimensions, it is used instead.
            // * So this block is skipped and the following run.
            // * An example of a case where this reveals itself is of
            //   an area whose top edge is diagonal and of
            //   a bar (whose top edge is straight...).
            //   The area's top edge is above the bar's top edge.
            //   When collapse=y,
            //   and the mouse is above the area's top edge,
            //   because the barTopEdge.dist2 = 0 (its an horizontal line)
            //   and the areaTopEdge.dist2 > 0 (it's a diagonal line),
            //   the bar is always chosen, even though the area's top edge is
            //   closer to the mouse.

            if(!(collapse && inside)) {
                if(pv.floatLess(curr.dist2, cand.dist2)) return -8;
                if(pv.floatLess(cand.dist2, curr.dist2)) return +5;
            }

            if(collapse && pv.floatLess(cand.cost, curr.cost)) return +6;
            return -9;
        }

        var choice = makeChoice();

        if(DEBUG) (function() {
            if(choice < -3 || choice > 0) {
                var pointMark = scenes && scenes.mark;
                console.log(
                        "POINT " + (choice > 0 ? "choose" : "skip") + " (" + choice + ") " +
                        (pointMark ? (pointMark.type + " " + index) : 'none') +
                        " in=" + inside +
                        " d2=" + (cand && cand.dist2) +
                        " cost=" + (cand && cand.cost ) +
                        " opaq=" + (visibility === 1));
            }
        }());

        if(choice > 0) {
            curr.hasArea = hasArea;
            curr.inside  = inside;
            curr.dist2   = cand.dist2;
            curr.cost    = cand.cost;
            curr.scenes  = scenes;
            curr.index   = index;
            curr.shape   = shape;
            
            // Be satisfied with the first insideStrict and opaque (visibility === 1) curr.
            // Cannot see through.
            // Hides anything below/after.
            if(hasArea && inside === 2 && (visibility === 1)) return true;
        }
    }

    function mousemove() {
        var e = pv.event;

        if(DEBUG) console.log("POINT MOUSE MOVE BEG");
        try {
            var point = {
                cost:    Infinity,
                dist2:   Infinity,
                inside:  0,
                hasArea: false,

                // For the radiusHyst2 test below.
                x: e.pageX || 0,
                y: e.pageY || 0
            };

            // Simulate a bit of hysteresis, by not reacting within a 3 px radius
            // from the last point change.
            // This stabilizes the experience a bit, by preventing alternation
            // between pointed scenes, near their "separation lines".
            if(unpoint && radiusHyst2 && pv.Shape.dist2(point, unpoint).cost < radiusHyst2)
                return;

            searchSceneChildren(this.scene[this.index], point);

            // When inside, max distance doesn't apply.
            // Note: !isFinite(point.cost) => no point after all.
            if(!point.inside && !isFinite(point.cost)) point = null;

            // Unpoint the old target, if it's not the new target.
            if(unpoint) {
                if(point &&
                   (unpoint.scenes == point.scenes) &&
                   (unpoint.index  == point.index )) {
                    return;
                }

                e.isPointSwitch = !!point;
                pv.Mark.dispatch("unpoint", unpoint.scenes, unpoint.index, e);
            }

            unpoint = point;

            // Point the new target, if there is one.
            if(point) {
                pv.Mark.dispatch("point", point.scenes, point.index, e);

                // Initialize panel.
                // Unpoint when the mouse leaves the pointing panel.
                if(pointingPanel) {
                    ;
                } else if(this.type === 'panel') {
                    pointingPanel = this;
                    this.event('mouseout', function() { mouseout.call(this.scene.$g); });

                    if(stealClick) pointingPanel.addEventInterceptor('click', eventInterceptor);
                } else {
                    pv.listen(this.root.canvas(), 'mouseout', mouseout);
                }
            }

        } finally {
            if(DEBUG) console.log("POINT MOUSE MOVE END");
        }
    }

    /** @private */
    function mouseout() {
        var e = pv.event;
        if(unpoint && !pv.ancestor(this, e.relatedTarget)) {
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
        if(arguments.length) {
            collapse = String(x);
            switch(collapse) {
                case "y": k.x = 1; k.y = 0; break;
                case "x": k.x = 0; k.y = 1; break;
                default:  k.x = 1; k.y = 1; collapse = null; break;
            }
            return mousemove;
        }
        return collapse;
    };
    
    if(keyArgs && keyArgs.collapse != null) mousemove.collapse(keyArgs.collapse);
    keyArgs = null;

    return mousemove;
};
