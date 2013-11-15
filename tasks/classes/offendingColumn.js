'use strict';

/* OffendingColumn "class" for creating OffendingColumn objects that
*  contains the type column number and message. These objects are later
*  stored in an OffendingLine object as a collection. If a parameter is
*  undefined, the class will give its variables a default value.
*
*  @param type: The type of the offense starting at the column.
*  @param column: The column number where the offense begins.
*  @param message:  The message that gives additional information about
*                   the offense.
*/
function OffendingColumn ( type, column, message ) {
  this._type = type || 'No type defined';
  this._column = column || -1;
  this._message = typeof message === 'string' ?
                  message : ' ';
}
OffendingColumn.prototype.getOffenseType = function () {
  return this._type;
};
OffendingColumn.prototype.getColumnNumber = function () {
  return this._column;
};
OffendingColumn.prototype.getMessage = function () {
  return this._message;
};


exports.createOffendingColumn = function ( type, column, message ) {
  return new OffendingColumn(type, column, message);
};