'use strict';

var grunt,
    force = true,
    override = false;

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
  return this._message.toString();
};


var loader = require('./preDefinedOffenses');

/* Holds objects with key type and pattern in a collection as search
*  criteria for offenses.
*/
var pre_defined_offenses = loader.getPreDefinedOffenses();

/* A list of offense types that will override the pre-defined offenses
*  given that the override options is set to true.
*/
var overriding_types = [];

//Force option. Defaults to true.
var force = true;

//Override option. Defaults to false.
var override = false;


function makeLowerCase( element ) {
        return element.toLowerCase();
}

function doesTypeExist ( type ) {
  var index = 0,
      exists = false;
  while (index < pre_defined_offenses.length && !exists) {
    if(pre_defined_offenses[index].type.toUpperCase() ===
       type.toUpperCase()){
      exists = true;
    }
    index++;
  }
  return exists;
}

function getPattern ( type ) {
  var index = 0,
      exists = false,
      pattern = -1;
  while (index < pre_defined_offenses.length && !exists) {
    if(pre_defined_offenses[index].type.toUpperCase() ===
       type.toUpperCase()){
      exists = true;
      pattern = pre_defined_offenses[index].pattern;
    }
    index++;
  }
  return pattern;
}

function getMessage ( type ) {
  var index = 0,
      exists = false,
      message = -1;
  while (index < pre_defined_offenses.length && !exists) {
    if(pre_defined_offenses[index].type.toUpperCase() ===
       type.toUpperCase()){
      exists = true;
      message = pre_defined_offenses[index].message;
    }
    index++;
  }
  return message;
}

/* Retrieve modifiers from the user-defined regexp pattern.
*
*  @param type:    An array of regexp modifiers.
*
*  returns         A normalized array of supported regexp modifiers.
*/
function getModifiers ( modifiers ) {
  var modifier_list = [];
  for (var mod in modifiers) {
    if ((modifiers[mod] === 'global' ||
        modifiers[mod] === 'g') &&
        modifier_list.indexOf('g') === -1) {
      modifier_list.push('g');
    }
    if ((modifiers[mod] === 'case-insensitive' ||
        modifiers[mod] === 'i') &&
        modifier_list.indexOf('i') === -1) {
      modifier_list.push('i');
    }
  }
  return modifier_list;
}

function removeDuplicates ( columns ) {
  var col_data,
      no_duplicates = {},
      no_dup_cols = [];
  for (var i = 0; i < columns.length; i++) {
    no_duplicates[columns[i].getOffenseType() +
    '&~:__:~&' + columns[i].getColumnNumber()] = columns[i].getMessage();
  }
  for(var type in no_duplicates) {
    col_data = type.split('&~:__:~&');
    no_dup_cols.push(new OffendingColumn(col_data[0],
                                        col_data[1],
                                        no_duplicates[type]));
  }
  return no_dup_cols;
}

/* Adds an additional backslash character to each single and double
*  quotes in the user-defined pattern.
*
*  @param pattern:    The pattern from a user-defined offense.
*
*  returns        The search pattern with all single and double quotes
*                 double escaped.
*/
function escapeAllQuotes ( pattern ) {
  var escaped_pattern = pattern.replace(/\'/g,"\\'");
  return escaped_pattern.replace(/\"/g,'\\"');
}

/* Finds all the columns of the given offense by returning the starting
*  index of said offense + 1 to offset array indexing. Each column of
*  an offense creates a Column object that holds the type of offense
*  and the column number. Additionally, each Column object is pushed
*  into an array of columns. If a type exists in the pre-defined
*  object of patterns, this method will use the pre-defined object
*  for the offense instead rather than the user-defined set. This can be
*  overridden by setting the 'override' option to true.
*
*  @param line: A line in a file to be searched for offending columns.
*  @param type: The type of offense to search for in the given line.
*  @param pattern [optional]: A pattern to search for as an offense
*                             in the given line.
*  @param message [optional]: A message giving more information about
*                             the offense.
*
*  returns      An array of offending column objects
*/
function findOffendingColumns ( line, type, pattern, message )
  {
    var result,
        defined_pattern,
        defined_message = message,
        pattern_modifiers = ['g', 'i'],
        columns = [];
    if(Array.isArray(pattern) && pattern.length > 0 &&
        (!doesTypeExist(type) || override)) {
      if(override &&
         overriding_types.indexOf(type.toUpperCase()) === -1) {
        overriding_types.push(type.toUpperCase());
      }
      if(pattern.length > 1){
        pattern_modifiers = getModifiers(pattern.slice(1));
      }
      defined_pattern = new RegExp(escapeAllQuotes(pattern[0]),
                                  pattern_modifiers.join(''));
    } else {
      if(doesTypeExist(type)){
        defined_pattern = getPattern(type);
        defined_message = getMessage(type);
      } else {
        return columns;
      }
    }
    while ( (result = defined_pattern.exec(line)) ) {
          columns.push(new OffendingColumn(type.toUpperCase(),
                                            result.index + 1,
                                            defined_message));
    }
    return columns;
  }

/* Regulates the creation of the list of offending columns by checking
*  if there is a user-defined set of offenses to look for and if there
*  is, search for those first before searching for the pre-defined
*  offenses. Note that user-defined offense types are matched as
*  case-insensitive, so "css" = "CSS".
*
*  @param extension: the file extension of the currently processing file.
*  @param line: A line in a file to be searched for offending columns.
*  @param offenses [optional]: A list of objects or a single object that
*                              a user provides with defined types and
*                              patterns.
*
*  returns     An array of offending column objects containing the
*              user-defined offenses and/or the pre-defined offenses.
*/
function createOffendingColumnsList ( extension, line, offenses ) {
  var merge_columns,
      columns = [];
  //If user-defined offenses are given, process those first
  if(offenses !== undefined) {
    for (var type in offenses) {
      if (!offenses.hasOwnProperty(type)) { continue; }
      /* Check if offenses has defined extensions and if not, search all
      *  extensions by default.
      */
      if(offenses[type].extensions === undefined ||
         offenses[type].extensions.length === 0){
        merge_columns = findOffendingColumns(line,
                                          type,
                                          offenses[type].pattern || [],
                                          offenses[type].message || ' ');
        columns = columns.concat(merge_columns);
      } else {
        offenses[type].extensions.map(makeLowerCase);
        //Check if the extension matches a user-defined extension.
        if (offenses[type].extensions.indexOf(
                              extension.toLowerCase()) !== -1) {
          merge_columns = findOffendingColumns(line,
                                          type,
                                          offenses[type].pattern || [],
                                          offenses[type].message || ' ');
          columns = columns.concat(merge_columns);
        } } }
  }
  /* Default search for pre-defined offenses from the patterns object.
  *  This search only occurs if the user does not give user-defined
  *  offenses, gives all erroneous user-defined offenses or if they set
  *  the 'force' option to true, which always finds the pre-defined
  *  offenses regardless of the presence of user-defined offenses.
  *  There is also concessions for the 'override' option where if it is
  *  set to true, then the pre-defined offenses of the same type as
  *  user-defined offenses will be overriden.
  */
  if(offenses === undefined ||
    (offenses !== undefined && force)) {
    for (var j in pre_defined_offenses) {
      if((overriding_types.indexOf(
              pre_defined_offenses[j].type.toUpperCase()) === -1) &&
        (pre_defined_offenses[j].extensions.indexOf(
                                extension.toLowerCase()) !== -1)) {
        merge_columns = findOffendingColumns(line,
                                      pre_defined_offenses[j].type,
                                      pre_defined_offenses[j].pattern,
                                      pre_defined_offenses[j].message);
        columns = columns.concat(merge_columns);
      }
    }
  }
  overriding_types = [];
  if(offenses === undefined || !force) {
    return columns;
  } else {
  /* Removes all duplicates if they exist. This handles the case if
  *  the user omits the pattern from his offense set, thus making
  *  the search see if it exists in the pre-defined offenses.
  */
    return removeDuplicates(columns);
  }
}

//INTERFACE
exports.init = function ( grunt_init, options ) {
  grunt = grunt_init;
  if(typeof options.force === 'boolean') { force = options.force; }
  if(typeof options.override === 'boolean') { override = options.override; }
};

exports.find = function ( path, source, items ) {
  return createOffendingColumnsList(path, source, items);
};