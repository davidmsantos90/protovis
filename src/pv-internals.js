(function() {
/**
 * @private Returns a prototype object suitable for extending the given class
 * <tt>f</tt>. Rather than constructing a new instance of <tt>f</tt> to serve as
 * the prototype (which unnecessarily runs the constructor on the created
 * prototype object, potentially polluting it), an anonymous function is
 * generated internally that shares the same prototype:
 *
 * <pre>function g() {}
 * g.prototype = f.prototype;
 * return new g();</pre>
 *
 * For more details, see Douglas Crockford's essay on prototypal inheritance.
 *
 * @param {function} f a constructor.
 * @returns a suitable prototype object.
 * @see Douglas Crockford's essay on <a
 * href="http://javascript.crockford.com/prototypal.html">prototypal
 * inheritance</a>.
 */
pv.extend = Object.create ?
    function(f){
      return Object.create(f.prototype || f);
    } :
    function(f) {
      function g() {}
      g.prototype = f.prototype || f;
      return new g();
    };

pv.extendType = function(g, f) {
    var sub = g.prototype = pv.extend(f);

    // Fix the constructor
    sub.constructor = g;

    return g;
};

// Is there any browser (still) supporting this syntax?
// Commented cause this messes up with the debugger's break on exceptions.

//try {
//  eval("pv.parse = function(x) x;"); // native support
//} catch (e) {

/**
 * @private Parses a Protovis specification, which may use JavaScript 1.8
 * function expresses, replacing those function expressions with proper
 * functions such that the code can be run by a JavaScript 1.6 interpreter. This
 * hack only supports function expressions (using clumsy regular expressions, no
 * less), and not other JavaScript 1.8 features such as let expressions.
 *
 * @param {string} s a Protovis specification (i.e., a string of JavaScript 1.8
 * source code).
 * @returns {string} a conformant JavaScript 1.6 source code.
 */
 pv.parse = function(js) { // hacky regex support
    var re = new RegExp("function\\s*(\\b\\w+)?\\s*\\([^)]*\\)\\s*", "mg"), m, d, i = 0, s = "";
    while (m = re.exec(js)) {
      var j = m.index + m[0].length;
      if (js.charAt(j) != '{') {
        s += js.substring(i, j) + "{return ";
        i = j;
        for (var p = 0; p >= 0 && j < js.length; j++) {
          var c = js.charAt(j);
          switch (c) {
            case '"': case '\'': {
              while (++j < js.length && (d = js.charAt(j)) != c) {
                if (d == '\\') j++;
              }
              break;
            }
            case '[': case '(': p++; break;
            case ']': case ')': p--; break;
            case ';':
            case ',': if (p == 0) p--; break;
          }
        }
        s += pv.parse(js.substring(i, --j)) + ";}";
        i = j;
      }
      re.lastIndex = j;
    }
    s += js.substring(i);
    return s;
  };

/**
 * @private Reports the specified error to the JavaScript console. Mozilla only
 * allows logging to the console for privileged code; if the console is
 * unavailable, the alert dialog box is used instead.
 *
 * @param e the exception that triggered the error.
 */
pv.error = function(e) {
  (typeof console === "undefined" || !console.error) ? alert(e) : console.error(e);
};

/**
 * @private Registers the specified listener for events of the specified type on
 * the specified target. For standards-compliant browsers, this method uses
 * <tt>addEventListener</tt>; for Internet Explorer, <tt>attachEvent</tt>.
 *
 * @param target a DOM element.
 * @param {string} type the type of event, such as "click".
 * @param {function} the event handler callback.
 */
pv.listen = function(target, type, listener) {
  listener = pv.listener(listener);

  if (type === 'load' || type === 'onload'){
      return pv.listenForPageLoad(listener);
  }

  if(target.addEventListener){
    target.addEventListener(type, listener, false);
  } else {
      if (target === window) {
        target = document.documentElement;
      }

      target.attachEvent('on' + type, listener);
  }

  return listener;
};

/**
 * @private Unregisters the specified listener for events of the specified type on
 * the specified target.
 *
 * @param target a DOM element.
 * @param {string} type the type of event, such as "click".
 * @param {function} the event handler callback or the result of {@link pv.listen}.
 */
pv.unlisten = function(target, type, listener){
    if(listener.$listener){
        listener = listener.$listener;
    }

    target.removeEventListener
        ? target.removeEventListener(type, listener, false)
        : target.detachEvent('on' + type, listener);
};

/**
 * @private Returns a wrapper for the specified listener function such that the
 * {@link pv.event} is set for the duration of the listener's invocation. The
 * wrapper is cached on the returned function, such that duplicate registrations
 * of the wrapped event handler are ignored.
 *
 * @param {function} f an event handler.
 * @returns {function} the wrapped event handler.
 */
pv.listener = function(f) {
  return f.$listener || (f.$listener = function(ev) {
      try {
        // In some rare cases, there's no event... (see {@see #listenForPageLoad})
        pv.event = ev = ev && pv.fixEvent(ev);

        return f.call(this, ev);
      } catch (ex) {
          // swallow top level error
          pv.error(ex);
      } finally {
        delete pv.event;
      }
  });
};

pv.fixEvent = function(ev){
    // Fix event (adapted from jQuery)
    if(ev.pageX == null && ev.clientX != null) {
        var eventDoc = (ev.target && ev.target.ownerDocument) || document;
        var doc  = eventDoc.documentElement;
        var body = eventDoc.body;

        ev.pageX = (ev.clientX * 1) + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
        ev.pageY = (ev.clientY * 1) + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

    return ev;
};

/**
 * @private Returns true iff <i>a</i> is an ancestor of <i>e</i>. This is useful
 * for ignoring mouseout and mouseover events that are contained within the
 * target element.
 */
pv.ancestor = function(a, e) {
  while (e) {
    if (e == a) return true;
    e = e.parentNode;
  }
  return false;
};

pv.getWindow = function(elem) {
    return (elem != null && elem == elem.window) ?
        elem :
        elem.nodeType === 9 ?
            elem.defaultView || elem.parentWindow :
            false;
};

var _reHiphenSep = /\-([a-z])/g;

pv.hiphen2camel = function(prop) {
    if (_reHiphenSep.test(prop)) {
        return prop.replace(_reHiphenSep, function($0, $1) {
            return $1.toUpperCase();
        });
    }
    return prop;
};

// Capture the "most" native possible version, not some poly-fill
var _getCompStyle = window.getComputedStyle;

/**
 * @private Computes the value of the specified CSS property <tt>p</tt> on the
 * specified element <tt>e</tt>.
 *
 * @param {string} p the name of the CSS property.
 * @param e the element on which to compute the CSS property.
 */
pv.css = function(e, p) {
  // Assuming element is of the same window as this script.
  return _getCompStyle ?
         _getCompStyle.call(window, e, null).getPropertyValue(p) :
         e.currentStyle[p === 'float' ? 'styleFloat' : pv.hiphen2camel(p)];
};

pv.cssStyle = function(e) {
    var style;
    if(_getCompStyle) {
        style = _getCompStyle.call(window, e, null);
        return function(p) { return style.getPropertyValue(p); };
    }

    style = e.currentStyle;
    return function(p) { return style[p === 'float' ? 'styleFloat' : pv.hiphen2camel(p)]; };
};

pv._getElementsByClass = function(searchClass, node) {
  if(node == null) { node = document; }

  var classElements = [],
      els = node.getElementsByTagName("*"),
      L = els.length,
      pattern = new RegExp("(^|\\s)" + searchClass + "(\\s|$)"), i, j;

  for (i = 0, j = 0 ; i < L ; i++) {
    if (pattern.test(els[i].className)) {
      classElements[j] = els[i];
      j++;
    }
  }

  return classElements;
};

pv.getElementsByClassName = function(node, classname) {
  // use native implementation if available
  return node.getElementsByClassName ?
         node.getElementsByClassName(classname) :
         pv._getElementsByClass(classname, node);
};

/* Adapted from jQuery.offset()
 */
pv.elementOffset = function(elem) {
    var docElem, body, win, clientTop, clientLeft, scrollTop, scrollLeft,
        box = { top: 0, left: 0 },
        doc = elem && elem.ownerDocument;

    if (!doc) {
        return;
    }

    body = doc.body;
    if(body === elem)  {
        return; // not supported
    }

    docElem = doc.documentElement;

    if ( typeof elem.getBoundingClientRect !== "undefined" ) {
        box = elem.getBoundingClientRect();
    }

    win = pv.getWindow(doc);

    clientTop  = docElem.clientTop  || body.clientTop  || 0;
    clientLeft = docElem.clientLeft || body.clientLeft || 0;
    scrollTop  = win.pageYOffset || docElem.scrollTop;
    scrollLeft = win.pageXOffset || docElem.scrollLeft;
    return {
        top:  box.top  + scrollTop  - clientTop,
        left: box.left + scrollLeft - clientLeft
    };
};

/**
 * Binds to the page ready event in a browser-agnostic
 * fashion (i.e. that works under IE!)
 */
pv.listenForPageLoad = function(listener) {

    // Catch cases where $(document).ready() is called after the
    // browser event has already occurred.
    if ( document.readyState === "complete" ) {
        listener(null); // <-- no event object to give
    }

    if (pv.renderer() === "svgweb") {
        // SVG web adds addEventListener to IE.
        window.addEventListener("SVGLoad", listener, false);
    } else {
        // Mozilla, Opera and webkit nightlies currently support this event
        if ( document.addEventListener ) {
            window.addEventListener("load", listener, false);

        // If IE event model is used
        } else if ( document.attachEvent ) {
            window.attachEvent("onload", listener);
        }
    }
};

/**
 * @public Returns the name of the renderer we're using -
 *
 * 'nativesvg' is the default - the native svg of the browser.
 * 'svgweb' is if we identify svgweb is there.
 */

pv.renderer = function(){
    var renderer = (typeof document.svgImplementation !== "undefined") ?
                   document.svgImplementation :
                   (typeof window.svgweb === "undefined") ? "nativesvg" : "svgweb";

    pv.renderer = function(){ return renderer; };

    return renderer;
};

/** @private Returns a locally-unique positive id. */
pv.id = function() {
  var id = 1; return function() { return id++; };
}();

/** @private Returns a function wrapping the specified constant. */
pv.functor = function(v) {
  return typeof v == "function" ? v : function() { return v; };
};

/**
 * Gets the value of an existing, own or inherited, and not "nully", property of an object,
 * or if unsatisfied, a specified default value.
 *
 * @param {object} [o] The object whose property value is desired.
 * @param {string} p The desired property name.
 * If the value is not a string,
 * it is converted to one, as if String(p) were used.
 * @param [dv=undefined] The default value.
 *
 * @returns {any} The satisfying property value or the specified default value.
 */
pv.get = function(o, p, dv){
    var v;
    return o && (v = o[p]) != null ? v : dv;
};

}());