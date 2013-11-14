'use strict';

var tabwidth = 4,
    offenses = {},
    collectionFactory = require('./collectionFactory'),
    grunt;

/* Helper function to convert all tab indentation into spaces equivalent
*  to the tab width based on the indentation option. This works in
*  tandem with the indentation option of JSHint so columns will be
*  calculated based on a correctly linted file.
*
*  @param chars: The number of \s characters to set the tab width ton
*/
function convertTabToTabWidth ( chars ) {
  var spaces_in_tabwidth = '';
  for (var i = 0; i < chars; i++) {
    spaces_in_tabwidth += ' ';
  }
  return spaces_in_tabwidth;
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
        tabwidth,
        extension = file.path.split('.'),
        lines = file.data.split(grunt.util.linefeed),
        offending_file = collectionFactory.createOffendingFile(file.path);
    for(var j in lines){
      //Converts all tab indentations into the specified tab width
      new_tab_line = lines[j].replace(/^\t/,
                                   convertTabToTabWidth(tabwidth));
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
exports.init = function( grunt_init, options ) {
  grunt = grunt_init;
  if (typeof options.tabwidth === 'number') { tabwidth = options.tabwidth; }
  if (Object.getOwnPropertyNames(options.offenses).length > 0 ||
      options.offenses !== undefined) {
    offenses = options.offenses;
  }
};

exports.assemble = function ( base, operator) {
  return assembleOffendingFile(base, operator);
};