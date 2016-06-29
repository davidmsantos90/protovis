
(function() {

/**
 * Returns a default quantitative, linear, scale for the specified domain. The
 * arguments to this constructor are optional, and equivalent to calling
 * {@link #domain}. The default domain and range are [0,1].
 *
 * <p>This constructor is typically not used directly; see one of the
 * quantitative scale implementations instead.
 *
 * @class Represents an abstract quantitative scale; a function that performs a
 * numeric transformation. This class is typically not used directly; see one of
 * the quantitative scale implementations (linear, log, root, etc.)
 * instead. <style type="text/css">sub{line-height:0}</style> A quantitative
 * scale represents a 1-dimensional transformation from a numeric domain of
 * input data [<i>d<sub>0</sub></i>, <i>d<sub>1</sub></i>] to a numeric range of
 * pixels [<i>r<sub>0</sub></i>, <i>r<sub>1</sub></i>]. In addition to
 * readability, scales offer several useful features:
 *
 * <p>1. The range can be expressed in colors, rather than pixels. For example:
 *
 * <pre>    .fillStyle(pv.Scale.linear(0, 100).range("red", "green"))</pre>
 *
 * will fill the marks "red" on an input value of 0, "green" on an input value
 * of 100, and some color in-between for intermediate values.
 *
 * <p>2. The domain and range can be subdivided for a non-uniform
 * transformation. For example, you may want a diverging color scale that is
 * increasingly red for negative values, and increasingly green for positive
 * values:
 *
 * <pre>    .fillStyle(pv.Scale.linear(-1, 0, 1).range("red", "white", "green"))</pre>
 *
 * The domain can be specified as a series of <i>n</i> monotonically-increasing
 * values; the range must also be specified as <i>n</i> values, resulting in
 * <i>n - 1</i> contiguous linear scales.
 *
 * <p>3. Quantitative scales can be inverted for interaction. The
 * {@link #invert} method takes a value in the output range, and returns the
 * corresponding value in the input domain. This is frequently used to convert
 * the mouse location (see {@link pv.Mark#mouse}) to a value in the input
 * domain. Note that inversion is only supported for numeric ranges, and not
 * colors.
 *
 * <p>4. A scale can be queried for reasonable "tick" values. The {@link #ticks}
 * method provides a convenient way to get a series of evenly-spaced rounded
 * values in the input domain. Frequently these are used in conjunction with
 * {@link pv.Rule} to display tick marks or grid lines.
 *
 * <p>5. A scale can be "niced" to extend the domain to suitable rounded
 * numbers. If the minimum and maximum of the domain are messy because they are
 * derived from data, you can use {@link #nice} to round these values down and
 * up to even numbers.
 *
 * @param {number...} domain... optional domain values.
 * @see pv.Scale.linear
 * @see pv.Scale.log
 * @see pv.Scale.root
 * @extends pv.Scale
 */
pv.Scale.quantitative = function() {
  var d = [0, 1], // default domain
      l = [0, 1], // default transformed domain
      r = [0, 1], // default range
      i = [pv.identity], // default interpolators
      type = Number, // default type
      n = false, // whether the domain is negative
      f = pv.identity, // default forward transform
      g = pv.identity, // default inverse transform
      tickFormatter = null, // custom tick formatting function
      dateTickFormat, //custom date tick format
      dateTickPrecision, //custom date tick precision
      dateTickWeekStart = 0, // custom date tick start day of week
      lastTicks;

  /** @private */
  function scale(x) {
    var j = pv.search(d, x);
    if (j < 0) j = -j - 2;
    j = Math.max(0, Math.min(i.length - 1, j));
    return i[j]((f(x) - l[j]) / (l[j + 1] - l[j]));
  }

  /** @private */
  scale.transform = function(forward, inverse) {
    /** @ignore */ f = function(x) { return n ? -forward(-x) : forward(x); };
    /** @ignore */ g = function(y) { return n ? -inverse(-y) : inverse(y); };
    l = d.map(f);
    return this;
  };

  /**
   * Sets or gets the input domain. This method can be invoked several ways:
   *
   * <p>1. <tt>domain(min, ..., max)</tt>
   *
   * <p>Specifying the domain as a series of numbers is the most explicit and
   * recommended approach. Most commonly, two numbers are specified: the minimum
   * and maximum value. However, for a diverging scale, or other subdivided
   * non-uniform scales, multiple values can be specified. Values can be derived
   * from data using {@link pv.min} and {@link pv.max}. For example:
   *
   * <pre>    .domain(0, pv.max(array))</pre>
   *
   * An alternative method for deriving minimum and maximum values from data
   * follows.
   *
   * <p>2. <tt>domain(array, minf, maxf)</tt>
   *
   * <p>When both the minimum and maximum value are derived from data, the
   * arguments to the <tt>domain</tt> method can be specified as the array of
   * data, followed by zero, one or two accessor functions. For example, if the
   * array of data is just an array of numbers:
   *
   * <pre>    .domain(array)</pre>
   *
   * On the other hand, if the array elements are objects representing stock
   * values per day, and the domain should consider the stock's daily low and
   * daily high:
   *
   * <pre>    .domain(array, function(d) d.low, function(d) d.high)</pre>
   *
   * The first method of setting the domain is preferred because it is more
   * explicit; setting the domain using this second method should be used only
   * if brevity is required.
   *
   * <p>3. <tt>domain()</tt>
   *
   * <p>Invoking the <tt>domain</tt> method with no arguments returns the
   * current domain as an array of numbers.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.domain
   * @param {number...} domain... domain values.
   * @returns {pv.Scale.quantitative} <tt>this</tt>, or the current domain.
   */
  scale.domain = function(array, min, max) {
    if (arguments.length) {
      var o; // the object we use to infer the domain type
      if (array instanceof Array) {
        if (arguments.length < 2) min = pv.identity;
        if (arguments.length < 3) max = min;
        o = array.length && min(array[0]);
        d = array.length ? [pv.min(array, min), pv.max(array, max)] : [];
      } else {
        o = array;
        d = Array.prototype.slice.call(arguments).map(Number);
      }
      if (!d.length) d = [-Infinity, Infinity];
      else if (d.length == 1) d = [d[0], d[0]];
      n = (d[0] || d[d.length - 1]) < 0;
      l = d.map(f);
      type = (o instanceof Date) ? newDate : Number;
      return this;
    }
    return d.map(type);
  };

  /**
   * Sets or gets the output range. This method can be invoked several ways:
   *
   * <p>1. <tt>range(min, ..., max)</tt>
   *
   * <p>The range may be specified as a series of numbers or colors. Most
   * commonly, two numbers are specified: the minimum and maximum pixel values.
   * For a color scale, values may be specified as {@link pv.Color}s or
   * equivalent strings. For a diverging scale, or other subdivided non-uniform
   * scales, multiple values can be specified. For example:
   *
   * <pre>    .range("red", "white", "green")</pre>
   *
   * <p>Currently, only numbers and colors are supported as range values. The
   * number of range values must exactly match the number of domain values, or
   * the behavior of the scale is undefined.
   *
   * <p>2. <tt>range()</tt>
   *
   * <p>Invoking the <tt>range</tt> method with no arguments returns the current
   * range as an array of numbers or colors.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.range
   * @param {...} range... range values.
   * @returns {pv.Scale.quantitative} <tt>this</tt>, or the current range.
   */
  scale.range = function() {
    if (arguments.length) {
      r = Array.prototype.slice.call(arguments);
      if (!r.length) r = [-Infinity, Infinity];
      else if (r.length == 1) r = [r[0], r[0]];
      i = [];
      for (var j = 0; j < r.length - 1; j++) {
        i.push(pv.Scale.interpolator(r[j], r[j + 1]));
      }
      return this;
    }
    return r;
  };

  /**
   * Inverts the specified value in the output range, returning the
   * corresponding value in the input domain. This is frequently used to convert
   * the mouse location (see {@link pv.Mark#mouse}) to a value in the input
   * domain. Inversion is only supported for numeric ranges, and not colors.
   *
   * <p>Note that this method does not do any rounding or bounds checking. If
   * the input domain is discrete (e.g., an array index), the returned value
   * should be rounded. If the specified <tt>y</tt> value is outside the range,
   * the returned value may be equivalently outside the input domain.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.invert
   * @param {number} y a value in the output range (a pixel location).
   * @returns {number} a value in the input domain.
   */
  scale.invert = function(y) {
    var j = pv.search(r, y);
    if (j < 0) j = -j - 2;
    j = Math.max(0, Math.min(i.length - 1, j));
    return type(g(l[j] + (y - r[j]) / (r[j + 1] - r[j]) * (l[j + 1] - l[j])));
  };

  /**
   * Returns an array of evenly-spaced, suitably-rounded values in the input
   * domain. This method attempts to return between 5 and 10 tick values. These
   * values are frequently used in conjunction with {@link pv.Rule} to display
   * tick marks or grid lines.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.ticks
   * @param {number} [N] optional number of desired ticks.
   * When <tt>Infinity</tt>, as many ticks as result from using the precision <i>precisionMin</i>.
   * If the later is not specified, then the default number of ticks is used anyway.
   * @param {object} [options] optional keyword arguments object.
   * @param {boolean} [options.roundInside=true] should the ticks be ensured to be strictly inside the scale domain, or to strictly outside the scale domain.
   * @param {number} [options.numberExponentMin] minimum value for the step exponent (numeric domain only).
   * @param {number} [options.numberExponentMax] maximum value for the step exponent (numeric domain only).
   * @param {number} [options.precision] fixed precision. For dates, overrides the dateTickPrecision property.
   * @param {number} [options.precisionMin] minimum precision.
   * @param {number} [options.precisionMax] maximum precision.
   * @param {number} [options.tickCountMax] maximum number of ticks.
   *
   * @returns {Array.<number>} an array input domain values to use as ticks.
   */
  scale.ticks = function(N, options) {
    var start = d[0],
        end   = d[d.length - 1],
        reverse = end < start,
        min = reverse ? end : start,
        max = reverse ? start : end;

    if(type === newDate)
      lastTicks = genDateTicks(N, min, max, dateTickPrecision, dateTickFormat, dateTickWeekStart, options);
    else
      lastTicks = genNumberTicks(N, min, max, options);

    return reverse ? lastTicks.reverse() : lastTicks;
  };

  /**
   * Formats the specified tick with a well defined string for the date
   * @function
   * @name pv.Scale.quantitative.prototype.dateTickFormat
   * @returns {string} a string with the desired tick format.
   */
  scale.dateTickFormat = function() {
    if(arguments.length) {
      dateTickFormat = arguments[0];
      return this;
    }
    return dateTickFormat;
  };

  /**
   * Generates date ticks with a specified precision.
   * @function
   * @name pv.Scale.quantitative.prototype.dateTickPrecision
   * @param {number|string} [precision] The number of milliseconds that separate ticks.
   * Can be given by the name of a standard time interval,
   * optionally immediately preceded by an integer (e.g. '30d').
   * <ul>
   *   <li>'y' - Year</li>
   *   <li>'m' - Month</li>
   *   <li>'w' - Week</li>
   *   <li>'d' - Day</li>
   *   <li>'h' - Hour</li>
   *   <li>'M' - Minute</li>
   *   <li>'s' - Second</li>
   *   <li>'ms' - Millisecond</li>
   * </ul>
   *
   * @returns {number} the current date tick precision.
   */
  scale.dateTickPrecision = function () {
    if (arguments.length) {
      dateTickPrecision = parseDatePrecision(arguments[0], 0);
      return this;
    }
    return dateTickPrecision;
  };

  /**
   * Generates date ticks starting on the specified day of week.
   *
   * Only applies to when the chosen date precision is of 7 days, i.e., 1 week.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.dateTickWeekStart
   * @param {number|string} [weekStart] The day of the week.
   * Either the name of the week day or the following numbers can be specified.
   * <ul>
   *   <li>0 - Sunday</li>
   *   <li>1 - Monday</li>
   *   <li>2 - Tuesday</li>
   *   <li>3 - Wednesday</li>
   *   <li>4 - Thursday</li>
   *   <li>5 - Friday</li>
   *   <li>6 - Saturday</li>
   * </ul>
   * @returns {number} the current start day of the week.
   */
  scale.dateTickWeekStart = function(weekStart) {
    if(arguments.length) {
      switch((''+weekStart).toLowerCase()) {
        case '0':case 'sunday':    dateTickWeekStart = 0; break;
        case '1':case 'monday':    dateTickWeekStart = 1; break;
        case '2':case 'tuesday':   dateTickWeekStart = 2; break;
        case '3':case 'wednesday': dateTickWeekStart = 3; break;
        case '4':case 'thursday':  dateTickWeekStart = 4; break;
        case '5':case 'friday':    dateTickWeekStart = 5; break;
        case '6':case 'saturday':  dateTickWeekStart = 6; break;
        default: dateTickWeekStart = 0; break;
      }
      return this;
    }
    return dateTickWeekStart;
  };

  /**
   * Gets or sets a custom tick formatter function.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.tickFormatter
   * @param {?(function((number|Date), number, number):string)=} f The function that formats number or date ticks.
   * The first argument is the number or date being formatted.
   *
   * The second argument, for numbers, is the number of significant decimal places,
   * and, for dates, is the tick precision.
   * This argument is only available if ticks have already been determined. Otherwise it will have value <tt>null</tt>.
   *
   * The third argument is the index of the tick being formatted.
   * This argument is only available if ticks have already been determined. Otherwise it will have value <tt>-1</tt>.
   *
   * The function is called in the context of the ticks array.
   * If ticks have not yet been determined, it is called in the global scope.
   *
   * By using the index of the being formatted value, it is possible to
   * take the previous and following values into account to decide on the actual format to use.
   *
   * The context ticks object exposes additional useful information:
   * <ul>
   *   <li>step — the used precision</li>
   *   <li>base — the base precision from which step is derived</li>
   *   <li>mult — the multiple of base precision that yields step (step = base * mult)</li>
   *   <li>format - the default formatting function</li>
   * </ul>
   *
   * @returns {pv.Scale|function((number|Date)):string} a custom formatter function or this instance.
   */
  scale.tickFormatter = function (f) {
    if (arguments.length) {
      tickFormatter = f;
      return this;
    }

    return tickFormatter;
  };

  /**
   * Formats the specified tick value using the appropriate precision, based on
   * the step interval between tick marks. If {@link #ticks} has not been called,
   * the argument is converted to a string, but no formatting is applied.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.tickFormat
   * @param {number|Date} t a tick value.
   * @param {number} [index=-1] the index of the tick being formatted.
   * When negative,
   * this means that, in the present formatting context,
   * the index is not known or should not be taken into account.
   *
   * @returns {string} a formatted tick value.
   */
  scale.tickFormat = function(t, index) {
    var text;

    if(tickFormatter) {
      if(!lastTicks) {
        lastTicks = [];
        lastTicks.step = lastTicks.base = lastTicks.mult = 1;
        lastTicks.decPlaces = 0;
        lastTicks.format = String;
      }

      var precision = type !== Number ? lastTicks.step : lastTicks.decPlaces;
      text = tickFormatter.call(lastTicks, t, precision, index != null ? index : -1);

      // Make sure it is a string
      text == null ? '' : ('' + text);
    } else if(lastTicks) {
      text = lastTicks.format(t);
    } else {
      text = String(t);
    }

    return text;
  };

  /**
   * "Nices" this scale, extending the bounds of the input domain to
   * evenly-rounded values. Nicing is useful if the domain is computed
   * dynamically from data, and may be irregular. For example, given a domain of
   * [0.20147987687960267, 0.996679553296417], a call to <tt>nice()</tt> might
   * extend the domain to [0.2, 1].
   *
   * <p>This method must be invoked each time after setting the domain.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.nice
   * @returns {pv.Scale.quantitative} <tt>this</tt>.
   */
  scale.nice = function() {
    if (d.length != 2) return this; // TODO support non-uniform domains
    var start = d[0],
        end = d[d.length - 1],
        reverse = end < start,
        min = reverse ? end : start,
        max = reverse ? start : end,
        span = max - min;

    /* Special case: empty, invalid or infinite span. */
    if (!span || !isFinite(span)) return this;

    var step = Math.pow(10, Math.round(Math.log(span) / Math.log(10)) - 1);
    d = [Math.floor(min / step) * step, Math.ceil(max / step) * step];
    if (reverse) d.reverse();
    l = d.map(f);
    return this;
  };

  /**
   * Returns a view of this scale by the specified accessor function <tt>f</tt>.
   * Given a scale <tt>y</tt>, <tt>y.by(function(d) d.foo)</tt> is equivalent to
   * <tt>function(d) y(d.foo)</tt>.
   *
   * <p>This method is provided for convenience, such that scales can be
   * succinctly defined inline. For example, given an array of data elements
   * that have a <tt>score</tt> attribute with the domain [0, 1], the height
   * property could be specified as:
   *
   * <pre>    .height(pv.Scale.linear().range(0, 480).by(function(d) d.score))</pre>
   *
   * This is equivalent to:
   *
   * <pre>    .height(function(d) d.score * 480)</pre>
   *
   * This method should be used judiciously; it is typically more clear to
   * invoke the scale directly, passing in the value to be scaled.
   *
   * @function
   * @name pv.Scale.quantitative.prototype.by
   * @param {Function} f an accessor function.
   * @returns {pv.Scale.quantitative} a view of this scale by the specified
   * accessor function.
   */

  pv.copyOwn(scale, pv.Scale.common);

  scale.domain.apply(scale, arguments);
  return scale;
};

// -----------
// NUMBER
function genNumberTicks(N, min, max, options) {
  var span = max - min, ticks;

  // Special case: empty, invalid or infinite span.
  if(!span || !isFinite(span)) {
    ticks = [+min];
    ticks.step = ticks.base = ticks.mult = 1;
    ticks.decPlaces = 0;
    ticks.format = pv.Format.number().fractionDigits(0);
  } else {

    var precision    = pv.parseNumNonNeg(pv.get(options, 'precision',    0)),
        precisionMin = pv.parseNumNonNeg(pv.get(options, 'precisionMin', 0)),
        precisionMax = pv.parseNumNonNeg(pv.get(options, 'precisionMax', Infinity)),
        roundInside  = pv.get(options, 'roundInside', true);

    if(!isFinite(precision)) precision = 0;
    if(!isFinite(precisionMin)) precisionMin = 0;
    if(!precisionMax) precisionMax = Infinity;


    // Combine exponent and precision constraints
    var exponentMin = pv.get(options, 'numberExponentMin'),
        exponentMax = pv.get(options, 'numberExponentMax');

    if(exponentMin != null && isFinite(exponentMin))
      precisionMin = Math.max(precisionMin, Math.pow(10, Math.floor(exponentMin)));

    // Highest multiplier is always 5, for any given base precision.
    if(exponentMax != null && isFinite(exponentMax))
      precisionMax = Math.min(precisionMax, 5 * Math.pow(10, Math.floor(exponentMax)));

    // There's an upper bound for both precisionMin and precisionMax.
    // When roundInside, unless precisionMin/Max <= span, 0 ticks result.
    // We want to ensure that at least one tick is always returned.
    if(roundInside) {
      if(precisionMin > span) precisionMin = span; // precisionMin = 0 does not fall here
      if(precisionMax > span) precisionMax = span; // precisionMax = Infinity does fall here
    }

    if(precisionMax < precisionMin) precisionMax = precisionMin;

    if(precision)
      precision = Math.max(Math.min(precision, precisionMax), precisionMin);
    else if(precisionMin === precisionMax)
      precision = precisionMin;

    // ------

    var overflow = 0, // no overflow
        fixed = !!precision,
        result, precMin, precMax, NObtained;

    if(fixed) {
      result = {
        base:  Math.abs(precision),
        mult:  1,
        value: 1
      };
      result.value = result.base;
    } else {
      var NMax = pv.parseNumNonNeg(pv.get(options, 'tickCountMax', Infinity));
      if(NMax < 1) NMax = 1;

        // When N is Infinite, it means, use precisionMin or tickCountMax.
        // If precisionMin is not defined, then N is defaulted to 10, anyway...
        if(N == null)
          N = Math.min(10, NMax);
        else if(!isFinite(N))
          N = isFinite(NMax) ? NMax : 10;
        else if(N > NMax)
          N = NMax;

        result = {
          base:  isFinite(N) ? pv.logFloor(span / N, 10) : 0,
          mult:  1,
          value: 1
        };
        result.value = result.base;

      // Maintain the precision within constraints.
      if(precisionMin > 0) {
        precMin = readNumberPrecision(precisionMin, /*isMin*/true);
        if(result.value < precMin.value) {
          numberCopyResult(result, precMin);
          overflow = -1;
        }
      }

      if(isFinite(precisionMax)) {
        precMax = readNumberPrecision(precisionMax, /*isMin*/false);
        if(precMin && precMax.value <= precMin.value) {
          precMax = null;
        } else if(precMax.value < result.value) {
          numberCopyResult(result, precMax);
          overflow = 1;
        }
      }

      // If we'd obtain "many" more ticks than desired,
      // reduce the number of ticks,
      // by only generating ticks for multiples (2,5,10) of the base precision.
      // Only if not already at the maximum precision (overflow = 1).
      if(overflow !== 1 && isFinite(N) && result.mult < 10) {
        // Compare to the base value,
        // as the err logic below is devised for that case (mult = 1).
        NObtained = span / result.base;
        if(N < NObtained) {
          var err = N / NObtained;

          // Take care not to reduce the existing multiplier - only consider a rule if multiplier can increase.
          // Don't increase precision to a point where 0 ticks would result - this can happen when roundInside and span < step.
          if(err <= .15) {
            result.mult = 10;
          } else if(result.mult < 5) {
            if(err <= .35) {
              result.mult = 5;
            } else if(result.mult < 2) {
              if(err <= .75) {
                result.mult = 2;
              }
            }
          }

          if(result.mult > 1) {
            result.value = result.base * result.mult;

            if(precMin && result.value < precMin.value) {
              numberCopyResult(result, precMin);
              overflow = -1;
            } else if(precMax && precMax.value < result.value) {
              numberCopyResult(result, precMax);
              overflow = 1;
            } else if(result.mult === 10) {
              // Now it's worth normalizing this case.
              result.base *= 10;
              result.mult = 1;
            }
          }
        }
      }
    } // if fixed else

    var resultPrev;

    while(true) {
      // When roundInside and:
      // * span = step  =>  start = end
      // * span < step  =>  start > end

      var step  = result.value,
          start = step * Math[roundInside ? 'ceil'  : 'floor'](min / step),
          end   = step * Math[roundInside ? 'floor' : 'ceil' ](max / step);

      if(resultPrev && ((end < start) || (precMax && (end - start) > precMax.value))) {
        result = resultPrev;
        break;
      }

      // Account for floating point precision errors.
      var exponent = Math.floor(pv.log(step, 10) + 1e-10);

      result.decPlaces = Math.max(0, -exponent);

      // When !roundInside, generates at least 2 ticks.
      // For cases with negative and positive data, generates at least 3 ticks, whatever the step.
      result.ticks = pv.range(start, end + step, step);

      // NMax >= 1
      if(fixed || overflow > 0 || result.ticks.length <= NMax) break;

      if(resultPrev && resultPrev.ticks.length <= result.ticks.length) {
        result = resultPrev;
        break;
      }

      result = numberResultAbove((resultPrev = result));
    }

    ticks = result.ticks;
    ticks.step = result.value;
    ticks.base = result.base;
    ticks.mult = result.mult;
    ticks.decPlaces = result.decPlaces;
    ticks.format = pv.Format.number().fractionDigits(result.decPlaces);
  }

  return ticks;
}

function numberCopyResult(to, from) {
  to.base  = from.base;
  to.mult  = from.mult;
  to.value = from.value;
  return to;
}

function numberResultAbove(result) {
  var out = numberCopyResult({}, result);
  switch(out.mult) {
    case 5: out.mult = 1; out.base *= 10; break;
    case 2: out.mult = 5; break;
    case 1: out.mult = 2; break;
  }
  out.value = out.base * out.mult;
  return out;
}

function readNumberPrecision(precision, isMin) {
  if(precision < 0) precision = -precision;

  var base = pv.logFloor(precision, 10),
      mult = precision / base;

  if(!isMin) { // floor
    if(mult >= 5) mult = 5;
    else if(mult >= 2) mult = 2;
    else mult = 1;
  } else { // ceil
    if(mult > 5) mult = 1, base *= 10;
    else if(mult > 2) mult = 5;
    else if(mult > 1) mult = 2;
    else mult = 1;
  }

  return {
    base:   base,
    mult:   mult,
    value:  base * mult,
    source: precision
  };
}

// -----------
// DATE
function newDate(x) {
  return new Date(x);
}

function genDateTicks(N, min, max, precision, format, weekStart, options) {
  var span = max - min, ticks;
  if(!span || !isFinite(span)) {
    ticks = [newDate(min)];
    ticks.step = ticks.base = ticks.mult = 1; // arbitrary value
    ticks.format = pv.Format.date("%x");
  } else {
    // -- Harmonize precision, precisionMin and precisionMax.
    precision = parseDatePrecision(pv.get(options, 'precision'), precision);

    var precisionMin = parseDatePrecision(pv.get(options, 'precisionMin'), 0),
        precisionMax = parseDatePrecision(pv.get(options, 'precisionMax'), Infinity);

    if(precisionMax < precisionMin) precisionMax = precisionMin;

    if(precision)
      precision = Math.max(Math.min(precision, precisionMax), precisionMin);
    else if(precisionMin === precisionMax)
      precision = precisionMin;

    var NMax = pv.parseNumNonNeg(pv.get(options, 'tickCountMax', Infinity));
    if(NMax < 2) NMax = 2;

    // Although `N` can be specified, all values are fine-tuned for N = 5 ...
    N = Math.min(N == null ? 5 : N, NMax);

    // -- Choose precision and multiple of.
    var keyArgs  = {
        weekStart:   weekStart,
        roundInside: pv.get(options, 'roundInside', 1) // for #ticks method
      },
      precResult = chooseDatePrecision(N, span, precision, precisionMin, precisionMax, keyArgs),
      fixed = precResult.fixed,
      overflow = precResult.overflow;

    // -- Generate ticks.
    var precResultPrev;

    while(true) {
      precResult.ticks = ticks = precResult.comp.ticks(min, max, precResult.mult, keyArgs);

      if(precResultPrev && precResult.precMax && (ticks[ticks.length - 1] - ticks[0]) > precResult.precMax.value) {
        precResult = precResultPrev;
        break;
      }

      // NMax >= 2
      if(fixed || overflow > 0 || precResult.ticks.length <= NMax) break;

      if(precResultPrev && precResultPrev.ticks.length <= precResult.ticks.length) {
        precResult = precResultPrev;
        break;
      }

      precResultPrev = precResult;
      precResult = precResult.comp.resultAbove(precResult.mult);
    }

    ticks = precResult.ticks;
    ticks.step = precResult.value;
    ticks.base = precResult.comp.value;
    ticks.mult = precResult.mult;
    ticks.format = parseTickDateFormat(format) || precResult.comp.format;
  }

  return ticks;
}

// -- Determine precision and multiple of.
function chooseDatePrecision(N, span, precision, precisionMin, precisionMax, options) {
  var overflow = 0,
      mult     = 1,
      fixed    = !!precision,
      dateComp, castResult, precMin, precMax;

  if(precision) {
    // Fixed precision.
    // Obtain the greatest standard precision that is less than or equal to the fixed precision.
    // Recognizes multiples of standard precisions as well.
    castResult = readDatePrecision(precision, /*ceil*/false);
    if(castResult.value !== precision) {
      // Custom precision.
      // Because the castResult's standard precision is less than `precision`,
      // we're sure to have a format mask that outputs less significance parts.
      // Although it can leave out some relevant more significant ones...
      dateComp = castResult.comp.withPrecision(precision);
      // mult = 1
    } else {
      // Standard precision, or multiple of.
      dateComp = castResult.comp;
      mult     = castResult.mult;
    }
  } else {
    // Variable/Auto precision.
    // Find the tick component that at the desired tick count, best fits a given span.
    if(isFinite(N)) {
      dateComp = getGreatestLessOrEqualDateComp(span, N);

      // If we'd generate too many ticks, skip some.
      mult = dateComp.multiple(span / dateComp.value, options);
    } else {
      // Use lowest possible precision.
      // precisionMin should also be specified.
      dateComp = lowestPrecisionValueDateComp();
      mult     = 1;
    }

    precision = dateComp.value * mult;

    if(precision    < precisionMin) precMin = readDatePrecision(precisionMin, /*ceil*/true );
    if(precisionMax < precision   ) precMax = readDatePrecision(precisionMax, /*ceil*/false);

    if(precMin && precision < precMin.value) {
      dateComp = precMin.comp;
      mult     = precMin.mult;
      overflow = -1;
    } else if(precMax && (precisionMin < precMax.value) && precMax.value < precision) {
      dateComp = precMax.comp;
      mult     = precMax.mult;
      overflow = +1;
    }
  }

  return {
    comp:     dateComp,
    mult:     mult,
    value:    dateComp.value * mult,
    source:   precision,
    overflow: overflow,
    fixed:    fixed,
    precMin:  precMin,
    precMax:  precMax
  };
}

function readDatePrecision(precision, ceil) {
  if(precision == null || precision <= 0 || !isFinite(precision)) return null;

  return (ceil ? lowestPrecisionValueDateComp : highestPrecisionValueDateComp)()
    .castValue(precision, /*ceil*/ceil);
}

// -----------
var dateCompCopyArgs = ['get', 'set', 'multiple', 'multiples', 'thresholds', 'closeds', 'castValue'];

function DateComponent(value, prev, keyArgs) {
  this.value  = value;
  this.mult   = keyArgs.mult || 1; // multiplier from component unit/value to base unit. E.g.: week = 7 * day; mult = 7;
  this.base   = this.mult === 1 ? this.value : Math.floor(this.value / this.mult);

  dateCompCopyArgs.forEach(function(p) {
    if(keyArgs[p] != null) this[p] = keyArgs[p];
  }, this);

  if(keyArgs.floor) this.floorLocal = keyArgs.floor;
  this.format = parseTickDateFormat(keyArgs.format);
  this.first  = pv.functor(keyArgs.first || 0); // in base unit
  this.prev   = prev;
  this.next   = null;

  if(prev) prev.next = this;
}

// Increment in component units (i.e. the specified `n` gets multiplied by the #mult property),
DateComponent.prototype.increment = function(d, n) {
  if(n == null) n = 1;
  if(this.mult !== 1) n *= this.mult;

  this.set(d, this.get(d) + n);
};

DateComponent.prototype.get = function(d) {
  return d.getMilliseconds();
};

DateComponent.prototype.set = function(d, v) {
  d.setMilliseconds(v);
};

DateComponent.prototype.floorLocal = function(d, options) {
  // noop for non-derived components.
};

DateComponent.prototype.floor = function(d, options) {
  // Reset all components before (less significant than) this one.

  // Only clear locally when a derived component (e.g. week, based on day, with mult 7).
  var skip = 0;
  if(this.mult !== 1) {
    this.floorLocal(d, options);
    // Skip the base value component (e.g. skip day).
    skip = this.base;
  }

  var comp = this.prev;
  while(comp) {
    // Only clear base components.
    if(comp.mult === 1 && comp.value !== skip) comp.clear(d, options);
    comp = comp.prev;
  }
};

DateComponent.prototype.floorMultiple = function(d, n, options) {
  var first = this.first(d, options),
      delta = this.get(d) - first; // base in units

  if(delta) {
    var M = n * this.mult,
        offset = Math.floor(delta / M) * M; // offset in base units

    this.set(d, first + offset);
  }
};

DateComponent.prototype.clear = function(d, options) {
  this.set(d, this.first(d, options));
};

// Chooses an appropriate multiple given a number of ticks.
DateComponent.prototype.multiple = function(N, options) {
  var ms = this.multiples,
      ts = this.thresholds,
      cl = this.closeds,
      L  = ms.length,
      i  = -1;

  while(++i < L) if(cl[i] ? (N <= ts[i]) : (N < ts[i])) return ms[i];
  throw new Error("Invalid configuration.");
};

DateComponent.prototype.resultAbove = function(mult) {
  return this.castValue((this.value * mult) + 0.1, /*ceil*/true);
};

DateComponent.prototype.castValue = function(value, ceil) {
  var ms = this.multiples;
  if(!ms) return this._castValueResult(1, value, 1);

  var m  = value / this.value,
      L  = ms.length,
      i;

  if(ceil) {
    i = -1;
    while(++i < L) if(m <= ms[i]) return this._castValueResult(ms[i], value, 0);

    // First of next precision component.
    return this.next
      ? this.next.castValue(value, ceil)
      : this._castValueResult(ms[L - 1], value, 1);
  }

  i = L;
  while(i--) if(ms[i] <= m) return this._castValueResult(ms[i], value, 0);

  // Last of prev precision component.
  return this.prev
    ? this.prev.castValue(value, ceil)
    : this._castValueResult(ms[0], value, -1);
};

DateComponent.prototype._castValueResult = function(mult, value, overflow) {
  return {
    comp:     this,
    mult:     mult,
    value:    this.value * mult,
    source:   value,
    overflow: overflow
  };
};

DateComponent.prototype.withPrecision = function(value) {
  var comp = this;
  if(this.value !== value) {
    // Custom precision, that reuses this one's format.
    // Base unit is millisecond.
    comp = new DateComponent(value, null, {
      mult:   value,
      format: this.format
    });
  }
  return comp;
};

DateComponent.prototype.ticks = function(min, max, mult, options) {
  var ticks = [],
      tick  = new Date(min);

  // TODO: need both?
  // -- Floor start date (floor, independently of roundInside).
  this.floor(tick, options);
  // Floor the start date to the chosen multiple's first date.
  if(mult > 1) this.floorMultiple(tick, mult, options);

  // -- Generate ticks
  if(pv.get(options, 'roundInside', 1)) {
    // Accept a start tick coincident with the data min value.
    // Increment, the start tick, otherwise.
    if(min !== +tick) this.increment(tick, mult);

    // At least one tick.
    do {
      ticks.push(new Date(tick));
      this.increment(tick, mult);

      // Accept an end tick coincident with the data max value.
    } while(tick <= max);
  } else {

    ticks.push(new Date(tick));
    do {
      this.increment(tick, mult);
      ticks.push(new Date(tick));
    } while(tick < max);
  }

  return ticks;
};

// -----------
// Date Utils

function parseTickDateFormat(format) {
  return format == null               ? null   :
         typeof format === 'function' ? format :
         pv.Format.date(format);
}

function firstWeekStartOfMonth(date, dateTickWeekStart) {
  var d = new Date(date.getFullYear(), date.getMonth(), 1),
      wd = dateTickWeekStart - d.getDay();

  if(wd) {
    if(wd < 0) wd += 7;
    d.setDate(d.getDate() + wd);
  }

  return d;
}

function parseDatePrecision(value, dv) {
  if(typeof value === 'string') {
    var n = +value;
    if(!isNaN(n)) {
      value = n;
    } else if(value) {
      var m = /^(\d*)([a-zA-Z]+)$/.exec(value);
      if(m) {
        value = parseDateInterval(m[2]);
        if(value) value *= (+m[1]) || 1;
      }
    }
  }

  if(typeof value !== 'number' || value < 0)
    value = dv != null ? dv : 0;

  return value;
}

pv.parseDatePrecision = parseDatePrecision;

function parseDateInterval(s) {
  switch(s) {
    case 'year':
    case 'y':  return 31536e6;
    case 'month':
    case 'm':  return 2592e6;
    case 'week':
    case 'w':  return 6048e5;
    case 'day':
    case 'd':  return 864e5;
    case 'hour':
    case 'h':  return 36e5;
    case 'minute':
    case 'M':  return 6e4;
    case 'second':
    case 's':  return 1e3;
    case 'millisecond':
    case 'ms': return 1;
  }
}

// -----------
// Date Registration, lookup

var _dateComps = [];

function defDateComp(value, keyArgs) {
  var prev = highestPrecisionValueDateComp();

  _dateComps.push(new DateComponent(value, prev, keyArgs));
}

function lowestPrecisionValueDateComp() {
  return _dateComps[0];
}

function highestPrecisionValueDateComp() {
  return _dateComps.length ? _dateComps[_dateComps.length - 1] : null;
}

// Obtains the greatest tick component less than or equal to length * N.
function getGreatestLessOrEqualDateComp(length, N) {
  if(N == null) N = 1;
  var prev = highestPrecisionValueDateComp(),
      comp;
  do {
    comp = prev;
  } while((length < N * comp.value) && (prev = comp.prev));

  return comp;
}

// -----------

// Definition order must be in ascending value/duration order.

// millisecond
defDateComp(1, {
  format: "%S.%Qs",
  multiples:  [ 1,  5,  25,  50,  100,      250],
  thresholds: [10, 50, 100, 200, 1000, Infinity],
  closeds:    [ 1,  1,   1,   1,    1,        1]
  //           <=  <=   <=  ...
});

// second
defDateComp(1e3, {
  get:    function(d) { return d.getSeconds(); },
  set:    function(d, v) { d.setSeconds(v); },
  format: "%I:%M:%S",
  multiples:  [ 1,  5, 10, 15],
  thresholds: [10, 60, 90, Infinity],
  closeds:    [ 1,  1,  1, 1]
});

// minute
defDateComp(6e4, {
  get:    function(d) { return d.getMinutes(); },
  set:    function(d, v) { d.setMinutes(v); },
  format: "%I:%M %p",
  multiples:  [ 1,  5, 10, 15],
  thresholds: [10, 15, 30, Infinity],
  closeds:    [ 1,  1,  1, 1]
});

// hour
defDateComp(36e5, {
  get:    function(d) { return d.getHours(); },
  set:    function(d, v) { d.setHours(v); },
  format: "%I:%M %p",
  multiples:  [ 1,  3, 6],
  thresholds: [10, 20, Infinity],
  closeds:    [ 1,  1, 1]
});

// day
defDateComp(864e5, {
  get:    function(d) { return d.getDate(); },
  set:    function(d, v) { d.setDate(v);    },
  format: "%m/%d",
  first:  1,
  multiples:  [ 1,  2,  3, 5],
  thresholds: [10, 15, 30, Infinity],
  closeds:    [ 1,  0,  0, 1]
});

// // TODO: with nn = 5, a 2 days span ends up being shown as 48 hour ticks (except some are skipped)

// week/7d   what is this? week of year? starting on?
defDateComp(6048e5, {
  get:    function(d) { return d.getDate(); },
  set:    function(d, v) { d.setDate(v);    },
  mult:   7,
  // floors day to previous week start.
  floor:  function(d, options) { // floorLocal
    var wd = d.getDay() - pv.get(options, 'weekStart', 0);
    if(wd !== 0) {
      if(wd < 0) wd += 7;

      this.set(d, this.get(d) - wd);
    }
  },
  first:  function(d, options) {
    return this.get(firstWeekStartOfMonth(d, pv.get(options, 'weekStart', 0)));
  },
  format: "%m/%d",
  multiples:  [ 1,  2, 3],
  thresholds: [10, 15, Infinity],
  closeds:    [ 1,  1, 1]
});

// month/30d
defDateComp(2592e6, {
  get:    function(d) { return d.getMonth(); },
  set:    function(d, v) { d.setMonth(v);    },
  format: "%m/%Y",
  multiples:  [ 1,  2, 3],
  thresholds: [12, 24, Infinity],
  closeds:    [ 1,  1, 1]
});

// year
defDateComp(31536e6, {
  get:    function(d) { return d.getFullYear(); },
  set:    function(d, v) { d.setFullYear(v);    },
  format: "%Y",
  // Multiples
  // 1, 2, 5, 10, 20, 50, 100, 200, 500, ...
  multiple: function(N) {
    if(N <= 10) return 1;
    var mult = pv.logCeil(N / 15, 10);
    if(N / mult < 2) mult /= 5;
    else if(N / mult < 5) mult /= 2;
    return mult;
  },
  castValue: function(value, ceil) {
    // ex: M = 205; mult = 2.05; base = 100
    // M = mult * base;
    var M = value / this.value,
        base, mult;
    if(M < 1) {
      if(!ceil)
        // Go to previous precision, if any.
        return this.prev
          ? this.prev.castValue(value, ceil)
          : this._castValueResult(1, value, /*overflow*/-1);

      base = 1;
    } else {
      base = pv.logFloor(M, 10); // 1, 10, 100...
    }

    mult = M / base;

    if(ceil) {
      if(mult > 5) {
        base *= 10;
        mult = 1;
      } else if(mult > 2) {
        mult = 5;
      } else if(mult > 1) {
        mult = 2;
      } else {
        mult = 1;
      }
    } else {
      if(mult > 5) {
        mult = 5;
      } else if(mult > 2) {
        mult = 2;
      } else if(mult > 1) {
        mult = 1;
      } else if(mult < 1) {
        // Go to previous precision, if any.
        return this.prev
          ? this.prev.castValue(value, ceil)
          : this._castValueResult(base, value, /*overflow*/-1);
      }
    }

    return this._castValueResult(base * mult, value, 0);
  }
});

}());
