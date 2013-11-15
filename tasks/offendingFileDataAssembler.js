'use strict';

var grunt,
    tabwidth = 4,
    offenses = {};

//Factory for creating collections and their derivatives.
var collectionFactory = require('./classes/collection');


function initialize ( grunt_init, options ) {
  grunt = grunt_init;
  if (typeof options.tabwidth === 'number') { tabwidth = options.tabwidth; }
  if (Object.getOwnPropertyNames(options.offenses).length > 0 ||
      options.offenses !== undefined) {
    offenses = options.offenses;
  }
}

function convertTabToTabWidth ( chars, line ) {
  var new_tab_line,
      current_char,
      spaces_in_tabwidth = '',
      firstChar = false,
      it = 0,
      spacetab = /[^\s\t]/,
      allSpaces = '';
  for (var i = 0; i < chars; i++) {
    spaces_in_tabwidth += " ";
  }
  while(it < line.length && !firstChar){
    current_char = line.charAt(it);
    if (spacetab.test(current_char)) {
      firstChar = true;
    } else {
      allSpaces += current_char;
      it++;
    }
  }
  allSpaces = allSpaces.replace(/\t/g, spaces_in_tabwidth);
  new_tab_line = allSpaces + line.slice(it);
  return new_tab_line;
}

function assembleOffendingLine ( extension, line, line_num, finder ) {
  var offending_line,
      offending_columns =
          finder.find(extension, line, offenses);
  if(offending_columns.length > 0) {
    offending_line = collectionFactory.createOffendingLine(line.trim(),
                                                           line_num);
    for (var i in offending_columns) {
              offending_line.addElement(offending_columns[i]);
    }
  } else {
    offending_line = false;
  }
  return offending_line;
}

/* Assembles an offending file's data by combining, as parts,
*  the offending file, the offending line and offending columns into a
*  comprehensive data object.
*  @param file: The offending file from the given path to be assembled
*               with the attained data.
*  @param finder: The finder object that gives the collection of
*                 offending columns.
*
*  returns      The assembled data of the offending file.
*/
function assembleOffendingFile ( file, finder ) {
    var offending_line,
        offending_columns,
        new_tab_line,
        extension = file.path.split('.'),
        lines = file.data.split(grunt.util.linefeed),
        offending_file = collectionFactory.createOffendingFile(file.path);
    for(var j in lines){
      //Converts all tab indentations into the specified tab width
      new_tab_line = convertTabToTabWidth(tabwidth, lines[j]);
      if(new_tab_line.trim().length > 0) {
        offending_line = 
            assembleOffendingLine(extension[extension.length - 1],
                                  new_tab_line,
                                  (+j) + 1,
                                  finder);
        if(offending_line !== false) {
          offending_file.addElement(offending_line);
        }
      } }
    return offending_file;
}


//INTERFACE
exports.init = function( grunt, options ) {
  initialize(grunt, options);
};

exports.assemble = function ( base, operator) {
  return assembleOffendingFile(base, operator);
};