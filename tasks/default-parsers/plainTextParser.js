'use strict';

var grunt,
    clean = 'none';

/* Line formatting using grunt's cross-browser linefeed utility and
*  a general horizontal line for parser purposes.
*/
var linefeed,
    block_space,
    hr;

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

function parseStart () {
  return ' ';
}

function parseHeader ( filepath ) {
  var check_file_text = 
        '[Checking for offenses in file: ' + filepath + ']';
  return cleaner(check_file_text) + linefeed;
}

function parseStartLine ( line_num ) {
  return hr + linefeed + cleaner('Offenses located at line number: L' +
          line_num) + linefeed + hr;
}

function parseLocation ( column_type,  column_num, column_message ) {
  var arrow_text = cleaner(indentBy(2) + '-> '),
      location_text = cleaner('C' + column_num),
      attribute_loc = cleaner(' offense located at column: ' +
                        location_text + '.') + linefeed,
      message = cleaner(indentBy(3) + column_message) + linefeed;
  return arrow_text + column_type + attribute_loc + message;
}

function parseSource ( line ) {
  return cleaner('Offending line: ' + line) + linefeed;
}

function parseEndLine () {
  return hr + block_space;
}
function parseFooter ( total ) {
  return cleaner('Number of Offenses: ' + total) + block_space +
                 linefeed;
}

function parseEnd () {
  return ' ';
}


//INTERFACE
exports.init = function ( grunt_init, options ) {
  grunt = grunt_init;
  linefeed = grunt.util.linefeed;
  block_space = linefeed + linefeed + linefeed;
  hr = '______________________________________________________' +
      linefeed;
  if(typeof options.cleaner === 'string') { clean = options.cleaner; }
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