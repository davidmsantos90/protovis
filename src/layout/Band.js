/**
 * Constructs a new, empty band layout. Layouts are not typically constructed
 * directly; instead, they are added to an existing panel via
 * {@link pv.Mark#add}.
 *
 * @class Implements a layout for banded visualizations; it is
 * mainly used for grouped bar charts.
 *
 * @extends pv.Layout
 */
pv.Layout.Band = function() {

    pv.Layout.call(this);

    var that = this,
        buildImplied = that.buildImplied,
        itemProps,
        values;

    /**
     * The prototype mark of the items mark.
     */
    var itemProto = new pv.Mark()
        .data  (function() { return values[this.parent.index]; })
        .top   (proxy("t"))
        .left  (proxy("l"))
        .right (proxy("r"))
        .bottom(proxy("b"))
        .width (proxy("w"))
        .height(proxy("h"))
        .antialias(proxy("antialias"));

    /**
     * Proxy the given property for an item of a band.
     * @private
     */
    function proxy(name) {
        return function() {
            /* bandIndex, layerIndex */
            return itemProps[name](this.index, this.parent.index);
        };
    }

    /**
     * Compute the layout.
     * @private
     */
    this.buildImplied = function(s) {
        buildImplied.call(this, s);

        /* Update shared fields */
        itemProps = Object.create(pv.Layout.Band.$baseItemProps);
        values = [];

        var data = s.layers,
            L = data.length;
        if(L > 0){
            var orient = s.orient,
                horizontal = /^(top|bottom)\b/.test(orient),
                bh = this.parent[horizontal ? "height" : "width"](),
                bands = this._readData(data, values, s),
                B = bands.length;

            /* Band order */
            if(s.bandOrder === "reverse") {
                bands.reverse();
            }

            /* Layer order */
            if(s.order === "reverse") {
                values.reverse();

                for (var b = 0; b < B; b++) {
                    bands[b].items.reverse();
                }
            }

            /* Layout kind */
            switch(s.layout){
                case "grouped": this._calcGrouped(bands, L, bh, s); break;
                case "stacked": this._calcStacked(bands, L, bh, s); break;
            }

            var hZero = s.hZero || 0;
            var isStacked = s.layout === 'stacked';
            for(var i = 0; i < B; i++) {
                // Have zero bars display a minimal stripe
                var band = bands[i];
                var hMargin2 = isStacked ? Math.max(0, band.vertiMargin)/2 : 0;
                for(var j = 0; j < L; j++) {
                    var item = band.items[j];
                    if(item.zero) {
                        item.h = hZero;
                        item.y -= hMargin2 + hZero / 2;
                    }
                }
            }

            this._bindItemProps(bands, itemProps, orient, horizontal);
       }
    };

    var itemAccessor = this.item = {
        end: this,

        add: function(type) {
            return that.add(pv.Panel)
                    .data(function(){return that.layers();})
                    .add(type)
                    .extend(itemProto);
        },

        order: function(value){
            that.order(value);
            return this;
        },

        /**
         * The item width pseudo-property;
         * determines the width of an item.
         */
        w: function(f){
            that.$iw = pv.functor(f);
            return this;
        },

        /**
         * The item height pseudo-property;
         * determines the height of an item.
         */
        h: function(f){
            that.$ih = pv.functor(f);
            return this;
        },

        /**
         * The percentage of total item width to band width
         * in a grouped layout.
         * <p>
         * The empty space is equally distributed in
         * separating items within a band.
         * </p>
         * <p>
         * Evaluated once per band
         * (on the corresponding band's item of the first series).
         * </p>
         * <pre>
         * f: (item, series) -> percentage
         * </pre>
         */
        horizontalRatio: function(f){
            that.$ihorizRatio = pv.functor(f);
            return this;
        },

        /**
         * The vertical margin that separates stacked items,
         * in a stacked layout.
         * <p>
         * Half the specified margin is discounted
         * from each of the items own height.
         * </p>
         *
         * <p>
         * Evaluated once per band
         * (on the corresponding band's item of the first series).
         * </p>
         * <pre>
         * f: (item, series) -> height
         * </pre>
         */
        verticalMargin: function(f){
            that.$ivertiMargin = pv.functor(f);
            return this;
        }
    };

    var bandAccessor = this.band = {
        end: this,

        /**
         * The band width pseudo-property;
         * determines the width of a band
         * when the item layout grouped.
         * <p>
         * Evaluated once per band
         * (on the corresponding band's item of the first series).
         * </p>
         * <pre>
         * f: (item, series) -> width
         * </pre>
         */
        w: function(f){
            that.$bw = pv.functor(f);
            return this;
        },

        /**
         * The band x pseudo-property;
         * determines the x center position of a band
         * in a layer panel.
         *
         * <p>
         * Evaluated once per band
         * (on the corresponding band's item of the first series).
         * </p>
         * <pre>
         * f: (item, series) -> x
         * </pre>
         */
        x: function(f){
            that.$bx = pv.functor(f);
            return this;
        },

        order: function(value){
            that.bandOrder(value);
            return this;
        },

        /**
         * Band differential control pseudo-property.
         *  2 - Drawn starting at previous band offset. Multiply values by  1. Don't update offset.
         *  1 - Drawn starting at previous band offset. Multiply values by  1. Update offset.
         *  0 - Reset offset to 0. Drawn starting at 0. Default. Leave offset at 0.
         * -1 - Drawn starting at previous band offset. Multiply values by -1. Update offset.
         * -2 - Drawn starting at previous band offset. Multiply values by -1. Don't update offset.
         * @private
         */
        differentialControl: function(f){
            that.$bDiffControl = pv.functor(f);
            return this;
        }
    };

    this.band.item = itemAccessor;
    this.item.band = bandAccessor;
};

pv.Layout.Band.$baseItemProps = (function(){
    var none = function() {return null;};
    return {t: none, l: none, r: none, b: none, w: none, h: none};
}());

pv.Layout.Band.prototype = pv.extend(pv.Layout)
    .property("orient", String)     // x-y orientation
    .property("layout", String)     // items layout within band: "grouped", "stacked"
    .property("layers") // data
    .property("yZero",  Number)  // The y zero base line
    .property("hZero",  Number)  // The height of a zero bar.
    .property("verticalMode",   String) // The vertical mode: 'expand', null
    .property("horizontalMode", String) // The horizontal mode: 'expand', null
    .property("order",     String)  // layer order; "reverse" or null
    .property("bandOrder", String)  // band order;  "reverse" or null
    ;

/**
 * Default properties for stack layouts.
 * The default orientation is "bottom-left",
 * the default layout is "grouped",
 * the default y zero base line is 0, and
 * the default layers is <tt>[[]]</tt>.
 *
 * @type pv.Layout.Band
 */
pv.Layout.Band.prototype.defaults = new pv.Layout.Band()
    .extend(pv.Layout.prototype.defaults)
    .orient("bottom-left")
    .layout("grouped")
    .yZero(0)
    .hZero(1.5)
    .layers([[]])
    ;

/** @private */ pv.Layout.Band.prototype.$bx =
/** @private */ pv.Layout.Band.prototype.$bw =
/** @private */ pv.Layout.Band.prototype.$bDiffControl =
/** @private */ pv.Layout.Band.prototype.$iw =
/** @private */ pv.Layout.Band.prototype.$ih =
/** @private */ pv.Layout.Band.prototype.$ivertiMargin = pv.functor(0);

/** @private */ pv.Layout.Band.prototype.$ihorizRatio = pv.functor(0.9);

/** @private The default values function; identity. */
pv.Layout.Band.prototype.$values = pv.identity;

/**
 * The values function; determines the values for a given band.
 * The default value is the identity function,
 * which assumes that the bands property is specified as
 * a two-dimensional (i.e., nested) array.
 *
 * @param {Function} f the values function.
 * @returns {pv.Layout.Band} this.
 */
pv.Layout.Band.prototype.values = function(f) {
  this.$values = pv.functor(f);
  return this;
};

pv.Layout.prototype._readData = function(data, layersValues, scene){
    var L = data.length,
        bands = [
            /*
            {
                x:   0, // x left position of each band
                w:   0, // width of each band
                iwr: 0, // item width ratio of each band
                items: [ // indexed by series index
                    {
                        h: 0, // height of each item
                        w: 0, // width of each item
                        x: 0  // position of each item (within its band) (calculated)
                    }
                ]
            }
            */
        ],
        B;

    /*
     * Iterate over the data, evaluating the values, x and y functions.
     * The context in which the x and y pseudo-properties are evaluated is a
     * pseudo-mark that is a *grandchild* of this layout.
     */
    var stack = pv.Mark.stack,
        hZero = scene.hZero,
        o = {parent: {parent: this}};

    stack.unshift(null);

    for (var l = 0; l < L; l++) {
        o.parent.index = l;
        stack[0] = data[l];

        /* Eval per-layer properties */

        var layerValues = layersValues[l] = this.$values.apply(o.parent, stack);
        if(!l){
            B = layerValues.length;
        }

        /* Eval per-item properties */
        stack.unshift(null);
        for (var b = 0; b < B ; b++) {
            stack[0] = layerValues[b];
            o.index  = b;

            /* First series evaluates band stuff, for each band */
            var band = bands[b];
            if(!band) {
                band = bands[b] = {
                    horizRatio:  this.$ihorizRatio.apply(o, stack),
                    vertiMargin: this.$ivertiMargin.apply(o, stack),
                    w: this.$bw.apply(o, stack),
                    x: this.$bx.apply(o, stack),
                    diffControl: this.$bDiffControl ? this.$bDiffControl.apply(o, stack) : 0,
                    items: []
                };
            }

            var ih = this.$ih.apply(o, stack); // may be null
            var h = ih != null ? Math.abs(ih) : ih;
            band.items[l] = {
                y: (scene.yZero || 0),
                x: 0,
                w: this.$iw.apply(o, stack),
                h: h,
                zero: h != null && h <= hZero,
                dir: ih < 0 ? -1 : 1 // null -> 1
            };
        }
        stack.shift();
    }
    stack.shift();

    return bands;
};

pv.Layout.Band.prototype._normalizeBands = function(bands, L, bh, scene) {
    var B = bands.length,
        items;

    if(scene.verticalMode === "expand") {
        for (var b = 0; b < B; b++) {
            items = bands[b].items;

            /* Sum across layers for this band */
            var hSum = null, nonNullCount = 0;
            for (var l = 0; l < L; l++) {
                /* We get rid of negative heights
                 * because it is preferable to respect the layer's order
                 * in this case, than to group negative and positive layers,
                 * taking them out of order.
                 */
                var item = items[l];
                item.dir = 1;
                var h = item.h;
                if(h != null){
                    nonNullCount++;
                    hSum += h; // null + 1 = 0 + 1
                }
            }

            /* Scale hs */
            if (nonNullCount){
                if (hSum) {
                    var hScale = bh / hSum;
                    for (var l = 0; l < L; l++) {
                        var h = items[l].h;
                        if(h != null){
                            items[l].h = h * hScale;
                            // Update the condition to have zero bars display a minimal stripe
                            items[l].zero = items[l].h <= scene.hZero;
                        }
                    }
                } else if (hSum == 0) {
                    // 0/0 ambiguous, just defer to standard bar behavior for now
                    for (var l = 0; l < L; l++) {
                        items[l].h = 0;
                    }
                } else { //TODO: still relevant after ==0?
                    var hAvg = bh / nonNullCount;
                    for (var l = 0; l < L; l++) {
                        var h = items[l].h;
                        if(h != null){
                            items[l].h = hAvg;
                        }
                    }
                }
            }
        }
    }
    return items
};

pv.Layout.Band.prototype._calcGrouped = function(bands, L, bh, scene) {
    var items = this._normalizeBands(bands, L, bh, scene);

    /* Compute item x positions relative to parent panel */
    for (var b = 0, B = bands.length; b < B ; b++) {
        var band = bands[b],
            items = band.items,
            w = band.w,
            horizRatio = band.horizRatio,
            wItems = 0;

        /* Total items width */
        for (var l = 0 ; l < L ; l++) { wItems += items[l].w; }

        if(L === 1) {
            /*
             * Horizontal ratio does not apply
             * There's no space between...
             */
            horizRatio = 1;
        } else if(!(horizRatio > 0 && horizRatio <= 1)) {
            horizRatio = 1;
        }

        if(w == null){
            /* Expand band width to contain all items plus ratio */
            w = band.w = wItems / horizRatio;

        } else if(scene.horizontalMode === 'expand'){
            /* Scale items width to fit in band's width */

            var wItems2 = horizRatio * w;
            if (wItems) {
                var wScale = wItems2 / wItems;
                for (var l = 0 ; l < L ; l++) {
                    items[l].w *= wScale;
                }
            } else {
                var wiavg = wItems2 / L;
                for (var l = 0 ; l < L; l++) {
                    items[l].w = wiavg;
                }
            }

            wItems = wItems2;
        }

        var wItemsWithMargin = wItems / horizRatio,
            /* items start x position */
            ix = band.x - (wItemsWithMargin / 2),
            margin = L > 1 ? ((wItemsWithMargin - wItems) / (L - 1)) : 0;

        for (var l = 0 ; l < L ; l++) {
            var item = items[l];
            item.x = ix;
            ix += item.w + margin;

            /* Negative direction turns into a lower iy */
            if(item.dir < 0){
                item.y -= item.h;
            }
        }
    }
};

pv.Layout.Band.prototype._calcStacked = function(bands, L, bh, scene){
    var items = this._normalizeBands(bands, L, bh, scene);

    /*
     * Propagate y offset to other layers.
     * Assign width.
     * Calc x position.
     * Discount vertiMargin
     */
    var yZero = scene.yZero,
        yOffset = yZero;

    for (var b = 0, B = bands.length; b < B; b++) {
        var band = bands[b],
            bx = band.x, // centered on band
            bDiffControl = band.diffControl,
            positiveGoesDown = (bDiffControl < 0), // -1 or -2
            vertiMargin = Math.max(0, band.vertiMargin);

        items = band.items;

        // diffControl
        var resultPos = this._layoutItemsOfDir(+1, positiveGoesDown, items, vertiMargin, bx, yOffset),
            resultNeg = null; // reset on each iteration
        if(resultPos.existsOtherDir) {
            resultNeg = this._layoutItemsOfDir(-1, positiveGoesDown, items, vertiMargin, bx, yOffset);
        }

        if(bDiffControl) {
            // Update offset?
            if(Math.abs(bDiffControl) === 1) {
                var yOffset0 = yOffset;
                yOffset = resultPos.yOffset;
                if(resultNeg) {
                    yOffset -= (yOffset0 - resultNeg.yOffset);
                }
            }
        } else {
            // reset offset afterwards
            yOffset = yZero;
        }
    }
};

pv.Layout.Band.prototype._layoutItemsOfDir = function(stackDir, positiveGoesDown, items, vertiMargin, bx, yOffset){
    var existsOtherDir = false,
        vertiMargin2 = vertiMargin / 2,
        efDir = (positiveGoesDown ? -stackDir : stackDir),
        reverseLayers = positiveGoesDown;

    for (var l = 0, L = items.length ; l < L ; l+=1) {
        var item = items[reverseLayers ? (L -l -1) : l];
        if(item.dir === stackDir){
            var h = item.h || 0; // null -> 0

            if(efDir > 0) {
                item.y = yOffset + vertiMargin2;
                yOffset += h;
            } else {
                item.y = yOffset - (h - vertiMargin2);
                yOffset -= h;
            }

            var h2 = h - vertiMargin;
            item.h = h2 > 0 ? h2 : 0;
            item.x = bx - item.w / 2;
        } else {
            existsOtherDir = true;
        }
    }

    return {
        existsOtherDir: existsOtherDir,
        yOffset: yOffset
    };
};

pv.Layout.Band.prototype._bindItemProps = function(bands, itemProps, orient, horizontal){
    /*
     * Find the property definitions for dynamic substitution.
     *
     * orient = xOrientation-yOrientation
     */
    var index = orient.indexOf("-"),
        ph = horizontal ? "h" : "w",
        pw = horizontal ? "w" : "h",
        px = index < 0 ?
            /* Default yOrientation
            * horizontal -> left
            * vertical   -> bottom
            */
            (horizontal ? "l" : "b") :
            /*
            * -l,r,t,b ...
            */
            orient.charAt(index + 1),

        /*
        * b,t,l,r
        */
        py  = orient.charAt(0);

    itemProps[px] = function(b, l) {return bands[b].items[l].x;};
    itemProps[py] = function(b, l) {return bands[b].items[l].y;};
    itemProps[pw] = function(b, l) {return bands[b].items[l].w;};
    itemProps[ph] = function(b, l) {return bands[b].items[l].h || 0;}; // null -> 0

    // Activating antialias for "zero" bars helps
    // bars not looking negative when positive, and the like.
    itemProps.antialias = function(b, l) {
        return bands[b].items[l].zero;
    };
};
