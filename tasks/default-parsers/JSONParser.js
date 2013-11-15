'use strict';

var grunt,
    clean = 'none';

/* Line formatting using grunt's cross-browser linefeed utility and
*  a general horizontal line for parser purposes.
*/
var linefeed,
    block_space;

/* Helper function to indent a line by (amount * 2) \s characters to
*  to make the output more readable.
*
*  @param amount: The number to indent by.
*
*  returns        The amount of \s characters to indent by * 2.
*/
function indentBy ( amount ) {
  var indent = '',
      it = 0;
  while (it < amount) {
    indent = indent + '  ';
    it++;
  }
  return indent;
}

/* Helper function to 'clean' a line of whitespaces based on a given
*  cleaner option value or the default value.
*
*  @param amount: The line to clean.
*
*  returns        The 'cleaned' line based on the given option.
*/
function cleaner ( line ) {
  var cleaned_line;
  switch(clean)
  {
    case 'none':
    cleaned_line = line;
    break;
    case 'trailing':
    cleaned_line = line.trim();
    break;
    case 'all':
    cleaned_line = line.replace(/\s|\t/gim, '');
    break;
    case 'all-tabs':
    cleaned_line = line.replace(/\t/gim, '');
    break;
    case 'all-spaces':
    cleaned_line = line.replace(/\s/gim, '');
    break;
    default:
    cleaned_line = line;
    break;
  }
  return cleaned_line;
}


//----------------------
function initialize ( grunt_init, options ) {
  grunt = grunt_init;
  linefeed = grunt.util.linefeed;
  block_space = linefeed + linefeed + linefeed;
  if(typeof options.cleaner === 'string') { clean = options.cleaner; }
}

function bracket ( indent, brace ) {
  return cleaner(indentBy(indent) + brace) + linefeed;
}

function parseStart () {
  var inline_offenses_object = cleaner('{ "offenses": {') +
                                linefeed,
      offensive_files_object = cleaner(indentBy(1) +
                                '"offensive-files": [') + linefeed;
  return inline_offenses_object + offensive_files_object;
}

function parseHeader ( filepath ) {
  var filepath_object = cleaner(indentBy(3) + '"filepath": "' +
                        filepath + '",') + linefeed,
      offensive_line_object = cleaner(indentBy(3) +
                              '"offensive-line": [') +  linefeed;
  return bracket(2,'{') + filepath_object +
          offensive_line_object;
}

function parseStartLine ( line_num ) {
  var line_number_object = cleaner(indentBy(5) + '"line-number": ' +
                            line_num + ',') + linefeed,
      offensive_column_object = cleaner(indentBy(5) +
                                '"offensive-column": [') + linefeed;
  return bracket(4,'{') + line_number_object + offensive_column_object;
}

function parseLocation ( column_type, column_num, column_message ) {
  var type_object = cleaner(indentBy(7) + '"type": "' +
                    column_type + '",') + linefeed,
      col_object = cleaner(indentBy(7) + '"column": ' + column_num +
                    ',') + linefeed,
      msg_object = cleaner(indentBy(7) + '"message": "' +
                    column_message + '"') + linefeed,
      offense_object = bracket(6,'{') + type_object + col_object +
                        msg_object + bracket(6,'},');
  return offense_object;
}

function parseSource ( line ) {
  var offensive_column_close = cleaner(indentBy(5) + '],') + linefeed,
      line_object = cleaner(indentBy(5) + '"line": "' + line + '"') +
                    linefeed;
  return offensive_column_close + line_object;
}

function parseEndLine () {
  return bracket(4,'},');
}

function parseFooter ( total ) {
  var offensive_line_close = cleaner(indentBy(3) + '],') + linefeed,
      total_offenses_object = cleaner(indentBy(3) +
                              '"total-offenses": ' + total) + linefeed;
  return offensive_line_close + total_offenses_object + bracket(2,'},');
}

function parseEnd () {
  var offensive_files_close = cleaner(indentBy(1) + ']') + linefeed;
  return offensive_files_close + cleaner('} }') + linefeed;
}
//----------------------


//INTERFACE
exports.init = function ( grunt, options ) {
  initialize(grunt, options);
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