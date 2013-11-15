'use strict';

/**************************************************************************
***************************************************************************
***************************************************************************
***************************************************************************
*
*  Collection "super class" that contains protected (by naming convention)
*  variables and accompanying methods for interacting with a general
*  collection of similar data. This super class will be extended by various
*  more specialized derived classes for different parts of the offending
*  files. If the parameter is undefined, the class will give the variable a
*  default value.
*
*  Interface Collection {
*    addElement ( element );
*    getLength ();
*    hasNext ();
*    getNext ();
*    resetPointer ();
*  }
*
***************************************************************************
***************************************************************************
***************************************************************************
**************************************************************************/
function Collection ( array ) {
  this._pointer = 0;
  this._collection = array || [];
  this._current_element = null;
}
Collection.prototype.addElement = function ( element ) {
  if(this._collection.length === 0) { this._current_element = element; }
  this._collection.push(element);
};
Collection.prototype.getLength = function () {
  return this._collection.length;
};
Collection.prototype.hasNext = function () {
  if(this._pointer < this._collection.length){ return true; }
  else { return false; }
};
Collection.prototype.getNext = function () {
  if(this._pointer < this._collection.length){
    var element = this._collection[this._pointer];
    this._current_element = element;
    this._pointer += 1;
    return element;
  }else {
    return -1;
  }
};
Collection.prototype.resetPointer = function () {
this._pointer = 0;
if(this._collection.length > 0) {
  this._current_element = this._collection[0];
}
return true;
};

/* OffendingFile "subclass" for creating OffendingFile objects which
*  contains the filepath and a collection of the offending lines in an
*  offenses array needed to read and parse later. These objects are later
*  stored in a collection object. If the parameter is undefined, the class
*  will give the variable a default value.
*
*  Extends: Collection
*
*  @param path: The path to the file in which the extracted
*               data pertains to.
*/
function OffendingFile ( path ) {
  Collection.call( this );
  this._path = path || 'No path defined.';
  
  this.getTotalOffenses = function () {
    var total = 0;
    for (var e in this._collection) {
      total += this._collection[e].getLength();
    }
    return total;
  };
  this.getFilePath = function () {
    return this._path;
  };
}
OffendingFile.prototype = new Collection();

/* OffendingLine "subclass" for creating OffendingLine objects which
*  contains the offense information needed to read and parse later. These
*  objects are later stored in an OffendingFile object as a collection.
*  If a parameter is undefined, the class will give its variables a
*  default value.
*
*  Extends: Collection
*
*  @param line: The line that contains offenses.
*  @param line_num: The line number of the offending line in the
*                   offending file.
*/
function OffendingLine ( line, line_num ) {
  Collection.call( this );
  this._line = line || 'No line defined.';
  this._line_num = line_num || -1;

  this.getLine = function () {
    return this._line;
  };
  this.getLineNumber = function () {
    return this._line_num;
  };
}
OffendingLine.prototype = new Collection();


exports.createCollection = function ( array ) {
  return new Collection(array);
};

exports.createOffendingFile = function ( path ) {
  return new OffendingFile(path);
};

exports.createOffendingLine = function ( line, line_num ) {
  return new OffendingLine(line, line_num);
};