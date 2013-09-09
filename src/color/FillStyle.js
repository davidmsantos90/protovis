(function() {
    /* Adapted from https://gitorious.org/~brendansterne/protovis/brendansternes-protovis */
    
    /**
     * TBD Returns the {@link pv.FillStyle} for the specified format string.
     * For example:
     * <ul>
     * <li>linear-gradient(angle-spec, white, black)</li>
     * <li>red</li>
     * <li>linear-gradient(to top, white, red 40%, black 100%)</li>
     * <li>linear-gradient(90deg, white, red 40%, black 100%)</li>
     * </ul>
     * 
     * @param {string} format the gradient specification string.
     * @returns {pv.FillStyle} the corresponding <tt>FillStyle</tt>.
     * @see <a href="http://www.w3.org/TR/css3-images/#gradients">CSS3 Gradients</a>
     */
    pv.fillStyle = function(format) {
        /* A FillStyle object? */
        if (format.type) { return format; }

        var k = format.key || format;
        var fillStyle = fillStylesByKey[k];
        if(!fillStyle) { 
            fillStyle = fillStylesByKey[k] = createFillStyle(format);
        } else {
            fillStyle = fillStyle.clone();
        }
        
        return fillStyle;
    };
    
    var fillStylesByKey = {}; // TODO: unbounded cache
    
    var createFillStyle = function(format) {
        /* A Color object? */
        if (format.rgb) { return new pv.FillStyle.Solid(format.color, format.opacity); }

        /* A gradient spec. ? */
        var match = /^\s*([a-z\-]+)\(\s*(.*?)\s*\)\s*$/.exec(format);
        if (match) {
            switch (match[1]) {
                case "linear-gradient": return parseLinearGradient(match[2]);
                case "radial-gradient": return parseRadialGradient(match[2]);
            }
        }

        // Default to solid fill
        return new pv.FillStyle.Solid(pv.color(format));
    };
    
    var keyAnglesDeg = {
        top:    0,
        'top right': 45,
        right:  90,
        'bottom right': 135,
        bottom: 180,
        'bottom left': 225,
        left:   270,
        'top left': 315
    };

    /*
     * linear-gradient(<text>) <text> := [<angle-spec>, ]<color-stop>, ...
     * 
     * <angle-spec> := <to-side-or-corner> | <angle-number> 
     *   -> default <angle-spec> is "to bottom"
     *    
     * <to-side-or-corner> := to (top | bottom) || (left | right) 
     *   top    -> 0deg 
     *   right  -> 90deg 
     *   bottom -> 180deg 
     *   left   -> 270deg
     * 
     * <angle-number> := <number>[deg] 
     * 
     * examples: 
     * "bottom~white to top~black"
     *    linear-gradient(to top, white, black) 
     *   
     * "bottom-right~white to top-left~black" 
     *    linear-gradient(to top left, white, black)
     */
    function parseLinearGradient(text) {
        var terms = parseText(text);
        if (!terms.length) {
            return null;
        }

        var angle = Math.PI;
        var keyAngle;
        var m, f;
        var term = terms[0];
        if (term.indexOf('to ') === 0) {
            // to side / corner
            m = /^to\s+(?:((top|bottom)(?:\s+(left|right))?)|((left|right)(?:\\s+(top|bottom))?))$/
                    .exec(term);
            if (m) {
                if (m[1]) {
                    // (top|bottom)(?:\s+(left|right))?
                    keyAngle = m[2];
                    if(m[3]) { keyAngle += ' ' + m[3]; }
                } else { // m[4]
                    // (left|right)(?:\\s+(top|bottom))?
                    keyAngle = m[5];
                    if(m[6]) { keyAngle = m[6] + ' ' + keyAngle; }
                }
                
                angle = pv.radians(keyAnglesDeg[keyAngle]);
                
                terms.shift();
            }
        } else {
            // Check number
            f = parseFloat(term); // tolerates text suffixes
            if (!isNaN(f)) {
                angle = f;

                // Check the unit
                if (/^.*?deg$/.test(term)) {
                    angle = pv.radians(angle);
                }
                terms.shift();
            }
        }
                
        var stops = parseStops(terms);
        switch (stops.length) {
            case 0: return null;
            case 1: return new pv.FillStyle.Solid(stops[0].color, 1);
        }

        return new pv.FillStyle.LinearGradient(angle, stops, text);
    }

    /*
     * radial-gradient(<text>) 
     * 
     * <text> := [<focal-point-spec>, ]<color-stop>, ... 
     * 
     * not implemented: 
     * <focal-point-spec> := at <point-or-side-or-corner> |
     *                       at <percentage-position> | 
     *                       at <percentage-position> <percentage-position>
     * 
     * <point-or-side-or-corner> := center | top left | top right | bottom left | bottom right | ... 
     *   -> default <point-or-side-or-corner> = "center"
     * 
     * <percentage-position> := <number>% 
     * 
     * examples: 
     *   radial-gradient(at center, white, black)
     */
    function parseRadialGradient(text) {
        var terms = parseText(text);
        if (!terms.length) {
            return null;
        }
        
        var stops = parseStops(terms);
        switch (stops.length) {
            case 0: return null;
            case 1: return new pv.FillStyle.Solid(stops[0].color, 1);
        }

        return new pv.FillStyle.RadialGradient(50, 50, stops, text);
    }

    function parseText(text) {
        var colorFuns  = {};
        var colorFunId = 0;
        
        text = text.replace(/\b\w+?\(.*?\)/g, function($0){
            var id = '__color' + (colorFunId++);
            colorFuns[id] = $0;
            return id;
        });
        
        var terms = text.split(/\s*,\s*/);
        if (!terms.length) {
            return null;
        }
        
        // Re-insert color functions
        if(colorFunId){
            terms.forEach(function(id, index){
                if(colorFuns.hasOwnProperty(id)){
                    terms[index] = colorFuns[id];
                }
            });
        }
        
        return terms;
    }
    
    /*
     * COLOR STOPS 
     * <color-stop> := <color-spec> [<percentage-position>] 
     * 
     * <percentage-position> := <number>% 
     * 
     * <color-spec> := rgb() | rgba() | hsl() | hsla() | white | ...
     */
    function parseStops(terms) {
        var stops = [];
        var minOffsetPercent = +Infinity;
        var maxOffsetPercent = -Infinity;
        var pendingOffsetStops = [];

        function processPendingStops(lastOffset) {
            var count = pendingOffsetStops.length;
            if (count) {
                var firstOffset = maxOffsetPercent;
                var step = (lastOffset - firstOffset) / (count + 1);
                for (var i = 0; i < count; i++) {
                    firstOffset += step;
                    pendingOffsetStops[i].offset = firstOffset;
                }

                pendingOffsetStops.length = 0;
            }
        }

        var i = 0;
        var T = terms.length;
        while (i < T) {
            var term = terms[i++];

            var m = /^(.+?)\s*([+\-]?[e\.\d]+%)?$/i.exec(term);
            if (m) {
                var stop = {
                    color: pv.color(m[1])
                };
                
                var offsetPercent = parseFloat(m[2]); // tolerates text suffixes
                if (isNaN(offsetPercent)) {
                    if (!stops.length) {
                        offsetPercent = 0;
                    } else if (i === T) { // last one defaults to "100"...
                        offsetPercent = Math.max(maxOffsetPercent, 100);
                    }
                }
                
                stops.push(stop);
                
                if (isNaN(offsetPercent)) {
                    pendingOffsetStops.push(stop);
                } else {
                    stop.offset = offsetPercent;

                    processPendingStops(offsetPercent);

                    if (offsetPercent > maxOffsetPercent) {
                        // Record maximum value so far
                        maxOffsetPercent = offsetPercent;
                    } else if (offsetPercent < maxOffsetPercent) {
                        // Cannot go backwards
                        offsetPercent = maxOffsetPercent;
                    }

                    if (offsetPercent < minOffsetPercent) {
                        minOffsetPercent = offsetPercent;
                    }
                }
            }
        }

        if (stops.length >= 2 && 
            (minOffsetPercent < 0 || maxOffsetPercent > 100)) {
            // Normalize < 0 and > 100 values, cause SVG does not support them
            // TODO: what about the interpretation of an end < 100 or begin > 0?
            var colorDomain = [];
            var colorRange = [];
            stops.forEach(function(stop) {
                colorDomain.push(stop.offset);
                colorRange.push(stop.color);
            });

            var colorScale = pv.scale.linear()
                .domain(colorDomain)
                .range(colorRange);

            if (minOffsetPercent < 0) {
                while (stops.length && stops[0].offset <= 0) {
                    stops.shift();
                }

                stops.unshift({
                    offset: 0,
                    color: colorScale(0)
                });
            }

            if (maxOffsetPercent > 100) {

                while (stops.length && stops[stops.length - 1].offset >= 100) {
                    stops.pop();
                }

                stops.push({
                    offset: 100,
                    color:  colorScale(100)
                });
            }
        }

        return stops;
    }
    
    // -----------
    
    var FillStyle = pv.FillStyle = function(type) {
        this.type = type;
        this.key  = type;
    };
    
    /* 
     * Provide {@link pv.Color} compatibility.
     */
    pv.extendType(FillStyle, new pv.Color('none', 1));
    
    FillStyle.prototype.rgb = function() {
        var color = pv.color(this.color);
        if(this.opacity !== color.opacity){
            color = color.alpha(this.opacity);
        }
        return color;
    };
    
    FillStyle.prototype.alphaBlend = function(mate) {
        return this.rgb().alphaBlend(mate);
    };
      
    FillStyle.prototype.rgbDecimal = function(mate) {
        return this.rgb().rgbDecimal(mate);
    };

    FillStyle.prototype.isDark = function() {
        return this.rgb().isDark();
    };
    
    // FillStyle.prototype.clone
    
    /**
     * Constructs a solid fill style. This constructor should not be invoked
     * directly; use {@link pv.fillStyle} instead.
     * 
     * @class represents a solid fill.
     * 
     * @extends pv.FillStyle
     */
    var Solid = pv.FillStyle.Solid = function(color, opacity) {
        FillStyle.call(this, 'solid');
        
        if(color.rgb){
            this.color   = color.color;
            this.opacity = color.opacity;
        } else {
            this.color   = color;
            this.opacity = opacity;
        }
          
        this.key += " " + this.color + " alpha(" + this.opacity + ")";
    };
    
    pv.extendType(Solid, FillStyle);
    
    Solid.prototype.alpha = function(opacity){
        return new Solid(this.color, opacity);
    };
    
    Solid.prototype.brighter = function(k){
        return new Solid(this.rgb().brighter(k));
    };

    Solid.prototype.darker = function(k){
        return new Solid(this.rgb().darker(k));
    };
    
    Solid.prototype.complementary = function() {
        return new Solid(this.rgb().complementary());
    };
    
    Solid.prototype.clone = function() {
        var o = pv.extend(Solid);
        o.type    = this.type;
        o.key     = this.key;
        o.color   = this.color;
        o.opacity = this.opacity;
        return o;
    };
    
    pv.FillStyle.transparent = new Solid(pv.Color.transparent);
    
    // ----------------
    
    var gradient_id = 0;

    var Gradient = pv.FillStyle.Gradient = function(type, stops) {
        FillStyle.call(this, type);
        
        this.id = ++gradient_id;
        this.stops = stops;
        
        if(stops.length){
            // Default color for renderers that do not support gradients
            this.color = stops[0].color.color;
        }
        
        this.key +=  
          " stops(" + 
          stops
          .map(function(stop){
            var color = stop.color;
            return color.color + " alpha(" + color.opacity + ") at(" + stop.offset + ")"; 
          })
          .join(", ") + 
          ")";
    };
    
    pv.extendType(Gradient, FillStyle);
    
    Gradient.prototype.rgb = function(){
        return this.stops.length ? this.stops[0].color : undefined;
    };
    
    Gradient.prototype.alpha = function(opacity){
        return this._cloneWithStops(this.stops.map(function(stop){
            return {offset: stop.offset, color: stop.color.alpha(opacity)};
        }));
    };
    
    Gradient.prototype.darker = function(k){
        return this._cloneWithStops(this.stops.map(function(stop){
            return {offset: stop.offset, color: stop.color.darker(k)};
        }));
    };
    
    Gradient.prototype.brighter = function(k){
        return this._cloneWithStops(this.stops.map(function(stop){
            return {offset: stop.offset, color: stop.color.brighter(k)};
        }));
    };
    
    Gradient.prototype.complementary = function(){
        return this._cloneWithStops(this.stops.map(function(stop){
            return {offset: stop.offset, color: stop.color.complementary()};
        }));
    };
    
    Gradient.prototype.alphaBlend = function(mate) {
        return this._cloneWithStops(this.stops.map(function(stop){
            return {offset: stop.offset, color: stop.color.alphaBlend(mate)};
        }));
    };
    
    Gradient.prototype.clone = function() {
        var Type = this.constructor;
        var o = pv.extend(Type);
        o.constructor = Type;
        o.id   = ++gradient_id;
        o.type = this.type;
        o.key = this.key;

        var stops = this.stops;
        o.stops = stops;
        if(stops.length) {
            // Default color for renderers that do not support gradients
            // Cannot use the this.color because it is assigned an per-mark-root id on render...
            o.color = stops[0].color.color;
        }
        
        this._initClone(o);
        
        return o;
    };
     
    // Gradient.prototype._initClone
    
    // ----------------
    
    var LinearGradient = pv.FillStyle.LinearGradient = function(angle, stops) {
        Gradient.call(this, 'lineargradient', stops);
        
        this.angle = angle;
        this.key +=  " angle(" + angle + ")";
    };

    pv.extendType(LinearGradient, Gradient);
    
    LinearGradient.prototype._cloneWithStops = function(stops){
        return new LinearGradient(this.angle, stops);
    };
    
    LinearGradient.prototype._initClone = function(o) {
        o.angle = this.angle;
    };
    
    // ----------------
    
    var RadialGradient = pv.FillStyle.RadialGradient = function(cx, cy, stops) {
        Gradient.call(this, 'radialgradient', stops);
        
        this.cx = cx;
        this.cy = cy;
        this.key +=  " center(" + cx + "," + cy + ")";
    };
    
    pv.extendType(RadialGradient, Gradient);
    
    RadialGradient.prototype._cloneWithStops = function(stops) {
        return new RadialGradient(this.cx, this.cy, stops);
    };
    
    RadialGradient.prototype._initClone = function(o) {
        o.cx = this.cx;
        o.cy = this.cy;
    };
})();
