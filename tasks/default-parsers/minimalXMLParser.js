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

function parseStart () {
  var start_file_tag = '<offenses>' + linefeed;
  return start_file_tag;
}

function parseHeader ( filepath ) {
  var start_file_tag = cleaner(indentBy(1) + '<offensiveFile>') +
                        linefeed,
      file_name_tag = cleaner(indentBy(2) + '<filepath>"' + filepath +
                        '"</filepath>') + linefeed;
  return start_file_tag + file_name_tag;
}

function parseStartLine ( line_num ) {
  var start_line_tag = cleaner(indentBy(2) + '<offensiveLine>') +
                        linefeed;
  var line_number_tag = cleaner(indentBy(3) + '<lineNumber>' + line_num +
      '</lineNumber>') + linefeed;
  return start_line_tag + line_number_tag;
}

function parseLocation ( column_type, column_num, column_message ) {
  var type_tag = cleaner(indentBy(4) + '<type>"' + column_type +
                  '"</type>') + linefeed,
      col_tag = cleaner(indentBy(4) + '<column>' + column_num +
                '</column>') + linefeed,
      msg_tag = cleaner(indentBy(4) + '<message>"' + column_message +
                '"</message>') + linefeed,
      offense_tag = cleaner(indentBy(3) + '<offensiveColumn>') +
                    linefeed + type_tag + col_tag + msg_tag +
                    cleaner(indentBy(3) + '</offensiveColumn>') +
                    linefeed;
  return offense_tag;
}

function parseSource ( line ) {
  var offending_line_tag = cleaner(indentBy(3) + '<line>"' + line +
                            '"</line>') + linefeed;
  return offending_line_tag;
}

function parseEndLine () {
  var end_line_tag = cleaner(indentBy(2) + '</offensiveLine>') +
                      linefeed;
  return end_line_tag;
}

function parseFooter ( total ) {
  var total_offenses_tag = cleaner(indentBy(2) + '<totalOffenses>' +
                            total + '</totalOffenses>') + linefeed,
      end_file_tag = cleaner(indentBy(1) + '</offensiveFile>') +
                      linefeed;
  return total_offenses_tag + end_file_tag;
}

function parseEnd () {
  var end_file_tag = '</offenses>' + linefeed;
  return end_file_tag;
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