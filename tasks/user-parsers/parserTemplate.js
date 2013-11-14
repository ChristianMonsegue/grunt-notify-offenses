//Advised to put all options getters here.
var grunt;

function parseStart () {
  //The top of the offenses output.
  return;
}

function parseHeader ( filepath ) {
  //Marks the beginning of each searched file.
  return;
}

function parseStartLine ( line_num ) {
  //Marks the beginning of each processed line in a searched file.
  return;
}

function parseLocation ( column_type, column_num, column_message ) {
  //A block containing offense information at a particular column.
  return;
}

function parseSource ( line ) {
 // Holds the offending line.
 return;
}

function parseEndLine () {
  // Marks the end of the each processed line in a search file.
  return;
}

function parseFooter ( total ) {
  // Takes information about the total number of offenses in a file.
  // Also marks the end of the searched file.
  return;
}

function parseEnd () {
  //The end of the offenses output.
  return;
}

//INTERFACE

//exports.init can be ignored, as it's only available for those who want access to grunt operations and the gruntfile options.
exports.init = function ( grunt_init, options ) {
  grunt = grunt_init;
  //Get whatever option values you want here from options.option
};

exports.parseStart = function () {
  return parseStart ();
};

exports.parseHeader = function ( header ) {
  return parseHeader ( header );
};

exports.parseStartLine = function ( row ) {
  return parseStartLine ( row );
};

exports.parseLocation = function ( name, col, msg  ) {
  return parseLocation ( name, col, msg );
};

exports.parseSource = function ( source ) {
  return parseSource ( source );
};

exports.parseEndLine = function () {
  return parseEndLine ();
};

exports.parseFooter = function ( footer ) {
  return parseFooter( footer );
};

exports.parseEnd = function () {
  return parseEnd ();
};