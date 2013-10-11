/**
 * A transient is an auxiliar mark type, 
 * that is created immediately associated with a main mark
 * and whose purpose is to allow specifying different property values
 * for an animation.
 * <p>Create a transient by calling a mark's {@link pv.Mark#on} method.
 * For example:</p>
 * <pre>new pv.Panel()
 *    .fillStyle("blue")
 *    .on("enter")
 *       .fillStyle("green")
 *    .on("exit")
 *       .fillStyle("red");
 * </pre>
 * @class
 * @extends pv.Mark
 */
pv.Transient = function(mark) {
  pv.Mark.call(this);
  this.fillStyle(null).strokeStyle(null).textStyle(null);
  this.on = function(state) { return mark.on(state); };
};

pv.Transient.prototype = pv.extend(pv.Mark);
