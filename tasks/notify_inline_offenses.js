/*
 *  grunt-notify-inline-css
 *  https://github.com/christian.monsegue/gruntplugins
 *
 *  Licensed under the MIT license.
 */



module.exports = function( grunt ) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('notify_inline_offenses',
                          'Searches through a list of files and notifies on all declarative inline code.',
                          function() {

    /*Variable to solve scope issues when calling "this" functions*/
    var _self = this;

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      to_file: true,
      reporter: {
        stout: 'default',
        output: 'default'
      },
      finder: {
        offenses: {
          "CSS": {
            message: '',
            pattern: []
          },
          "Align": {}
        },
        force: true,
        override: false
      },
      assembler: {
        tabwidth: 4,
        trim_lines: 'trailing'
      }
    });


    /* Line formatting using grunt's cross-browser linefeed utility and
    *  a general horizontal line for parser purposes.
    */
    var linefeed = grunt.util.linefeed,
        block_space = linefeed + linefeed + linefeed,
        hr = '______________________________________________________' +
          linefeed;

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
      this._message = message || ' ';
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

    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Finder object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types.
    *
    *  Interface Finder {
    *    find ( source, [items,]);
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingColumnsByLineFinder = (function () {

      /* Holds objects with key type and pattern in a collection as search
      *  criteria for offenses.
      */
      var pre_defined_offenses =
      [
        {
          type: 'CSS',
          pattern: /style[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\$_\"\']*(\"|\')/gi,
          message: 'Style attributes should belong in a .css or .less file.'
        },
        {
          type: 'Align',
          pattern: /align[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\$_\"\']*(\"|\')/gi,
          message: 'Align attributes should belong in a .css or .less file.'
        }
      ];

      /* A list of offense types that will override the pre-defined offenses
      *  given that the override options is set to true.
      */
      var overriding_types = [];


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
            pattern = -1;
        while (index < pre_defined_offenses.length && !exists) {
          if(pre_defined_offenses[index].type.toUpperCase() ===
             type.toUpperCase()){
            exists = true;
            pattern = pre_defined_offenses[index].message;
          }
          index++;
        }
        return pattern;
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
      function findOffendingColumns ( line, type, pattern, message ) {
          var defined_pattern,
              result,
              defined_message = message,
              pattern_modifiers = ['g', 'i'],
              columns = [];
          if(Array.isArray(pattern) && pattern.length > 0 &&
              (!doesTypeExist(type) || options.finder.override)) {
            if(options.finder.override &&
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
      *  @param line: A line in a file to be searched for offending columns.
      *  @param offenses [optional]: A list of objects or a single object that
      *                              a user provides with defined types and
      *                              patterns.
      *
      *  returns     An array of offending column objects containing the
      *              user-defined offenses and/or the pre-defined offenses.
      */
      function createOffendingColumnsList ( line, offenses ) {
        var merge_columns,
            columns = [];
        //If user-defined offenses are given, process those first
        if(offenses !== undefined) {
          
          for (var type in offenses) {
            if (!offenses.hasOwnProperty(type)) { continue; }
            merge_columns = findOffendingColumns(line,
                                                type,
                                                offenses[type].pattern || [],
                                                offenses[type].message || ' ');
            columns = columns.concat(merge_columns);
          }
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
          (offenses !== undefined && options.finder.force)) {
          for (var j in pre_defined_offenses) {
              if(overriding_types.indexOf(
                      pre_defined_offenses[j].type.toUpperCase()) === -1) {
                merge_columns = findOffendingColumns(line,
                                              pre_defined_offenses[j].type,
                                              pre_defined_offenses[j].pattern,
                                              pre_defined_offenses[j].message);
                columns = columns.concat(merge_columns);
              }
          }
        }
        if(offenses === undefined || !options.finder.force) {
          return columns;
        } else {
        /* Removes all duplicates if they exist. This handles the case if
        *  the user omits the pattern from his offense set, thus making
        *  the search see if it exists in the pre-defined offenses.
        */
          return removeDuplicates(columns);
        }
      }

      return {
        find: function ( source, items ) {
          return createOffendingColumnsList(source, items);
        }
      };

    })();



    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Assembler object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types. It also builds the OffendingLine and
    *  the OffendingFile objects, and ties them together with the
    *  OffendingColumns object, thus "assembling" the separate parts into one.
    *
    *  Interface Assembler {
    *    assemble ( base, [operators,] );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingFileDataAssembler = (function () {

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

      function trimmer ( line ) {
        var trim_option = options.assembler.trim_lines || 'default';
        var trimmed_line = line;
        switch(trim_option.toLowerCase())
        {
          case 'none':
          trimmed_line = line;
          break;
          case 'trailing':
          trimmed_line = line.trim();
          break;
          case 'all':
          trimmed_line = line.replace(/\s|\t/gi, '');
          break;
          case 'all-tabs':
          trimmed_line = line.replace(/\t/gi, '');
          break;
          case 'all-spaces':
          trimmed_line = line.replace(/\s/gi, '');
          break;
          default:
          trimmed_line = line.trim();
          break;
        }
        return trimmed_line;
      }

      function assembleOffendingLine ( line, line_num, finder ) {
        var trimmed_line,
            offending_line,
            offending_columns =
                finder.find(line, options.finder.offenses);
        if(offending_columns.length > 0) {
          trimmed_line = trimmer(line);
          offending_line = new OffendingLine(trimmed_line, line_num);
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
              lines = file.data.split(linefeed),
              offending_file = new OffendingFile(file.path);
          for(var j in lines){
            tabwidth = (typeof options.assembler.tabwidth === 'number') ?
                        options.assembler.tabwidth : 4;
            //Converts all tab indentations into the specified tab width
            new_tab_line = lines[j].replace(/^\t/,
                                         convertTabToTabWidth(tabwidth));
            if(new_tab_line.trim().length > 0) {
                offending_line = assembleOffendingLine(new_tab_line,
                                                       (+j) + 1,
                                                       finder);
                if(offending_line !== false) {
                  offending_file.addElement(offending_line);
                }
            } }
          return offending_file;
      }

    return {
      assemble: function ( base, operator ) {
        return assembleOffendingFile(base, operator);
      }
    };

    })();

    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Parser objects for parsing the assembled data objects for the reporter.
    *  These parsers will be injected into the reader.
    *
    *  Interface Parser {
         parseStart();
    *    parseHeader ( header );
    *    parseStartLine ( row );
    *    parseLocation ( name, col, msg );
    *    parseSource ( source );
    *    parseEndLine ();
         parseFooter ( footer );
    *    parseEnd ();
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/

    /*Parses the given text into a PlainText format*/
    var PlainTextParser = (function () {

      function parseStart () {
        return '';
      }

      function parseHeader ( filepath ) {
        var check_file_text = 
              '[Checking for offenses in file: ' + filepath + ']';
        return check_file_text + linefeed;
      }

      function parseStartLine ( line_num ) {
        return hr + 'Offenses located at line number: L' + line_num +
                linefeed + hr;
      }

      function parseLocation ( column_type,  column_num, column_message ) {
        var arrow_text = indentBy(2) + '-> ',
            location_text = 'C' + column_num,
            attribute_loc = ' attribute located at column: ' + location_text +
                            '.' + linefeed,
            message = indentBy(3) + column_message + linefeed;
        return arrow_text + column_type + attribute_loc + message;
      }

      function parseSource ( line ) {
        return 'Offending line: ' + line + linefeed;
      }

      function parseEndLine () {
        return hr + block_space;
      }
      function parseFooter ( total ) {
        return 'Number of Offenses: ' + total + block_space + linefeed;
      }

      function parseEnd () {
        return '';
      }

      return {
        parseStart: function () {
          return parseStart ();
        },
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function ( row ) {
          return parseStartLine ( row );
        },
        parseLocation: function ( name, col, msg  ) {
          return parseLocation ( name, col, msg );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseFooter: function ( footer ) {
          return parseFooter( footer );
        },
        parseEnd: function () {
          return parseEnd ();
        }
      };
    })();

    /*Parses the given text into a colorful PlainText format*/
    var DecoratedPlainTextParser = (function () {

      function parseStart () {
        return '';
      }

      function parseHeader ( filepath ) {
        var check_file_text =
            ('[Checking for offenses in file: ' + filepath +']').magenta.bold;
        return check_file_text + linefeed;
      }

      function parseStartLine ( line_num ) {
        return hr + 'Offenses located at line number: ' +
                ('L' + line_num).white.bold + linefeed + hr;
      }

      function parseLocation ( column_type, column_num, column_message ) {
        var arrow_text = indentBy(2) + ('-> ').yellow.bold,
            location_text = ('C' + column_num).white.bold,
            attribute_loc = ' attribute located at column: ' + location_text +
                            '.' + linefeed,
            message = indentBy(3) + (column_message).yellow.bold + linefeed;
        return arrow_text + column_type + attribute_loc + message;
      }

      function parseSource ( line ) {
        return ('Offending line: ').red.bold  + line + linefeed;
      }

      function parseEndLine () {
        return  hr + block_space;
      }
      function parseFooter ( total ) {
        //Add empty string to total to convert to a String and use formatting
        return 'Number of Offenses: ' + (total+'').green.bold + block_space +
                linefeed;
      }

      function parseEnd () {
        return '';
      }

      return {
        parseStart: function () {
          return parseStart ();
        },
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function ( row ) {
          return parseStartLine ( row );
        },
        parseLocation: function ( name, col, msg  ) {
          return parseLocation ( name, col, msg );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseFooter: function ( footer ) {
          return parseFooter( footer );
        },
        parseEnd: function () {
          return parseEnd ();
        }
      };
    })();

    /*Parses the given text into a basic XML format*/
    var MinimalXMLParser = (function () {
      function parseStart () {
        var start_file_tag = '<inlineOffenses>' + linefeed;
        return start_file_tag;
      }

      function parseHeader ( filepath ) {
        var start_file_tag = indentBy(1) + '<offensiveFile>' + linefeed,
            file_name_tag = indentBy(2) + '<filepath>"' + filepath +
                              '"</filepath>' + linefeed;
        return start_file_tag + file_name_tag;
      }

      function parseStartLine ( line_num ) {
        var start_line_tag = indentBy(2) + '<offensiveLine>' + linefeed;
        var line_number_tag = indentBy(3) + '<lineNumber>' + line_num +
            '</lineNumber>' + linefeed;
        return start_line_tag + line_number_tag;
      }

      function parseLocation ( column_type, column_num, column_message ) {
        var type_tag = indentBy(4) + '<type>"' + column_type +
                        '"</type>' +
                        linefeed,
            col_tag = indentBy(4) + '<column>' + column_num +
                      '</column>' + linefeed,
            msg_tag = indentBy(4) + '<message>' + column_message +
                      '</message>' + linefeed,
            offense_tag = indentBy(3) + '<offensiveColumn>' + linefeed +
                          type_tag + col_tag + msg_tag + indentBy(3) +
                          '</offensiveColumn>' + linefeed;
        return offense_tag;
      }

      function parseSource ( line ) {
        var offending_line_tag = indentBy(3) + '<line>"' + line + '"</line>' +
                              linefeed;
        return offending_line_tag;
      }

      function parseEndLine () {
        var end_line_tag = indentBy(2) + '</offensiveLine>' + linefeed;
        return end_line_tag;
      }

      function parseFooter ( total ) {
        var total_offenses_tag = indentBy(2) + '<totalOffenses>' + total +
                              '</totalOffenses>' + linefeed,
            end_file_tag = indentBy(1) + '</offensiveFile>' + linefeed;
        return total_offenses_tag + end_file_tag;
      }

      function parseEnd () {
        var end_file_tag = '</inlineOffenses>' + linefeed;
        return end_file_tag;
      }

      return {
        parseStart: function () {
          return parseStart ();
        },
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function ( row ) {
          return parseStartLine ( row );
        },
        parseLocation: function ( name, col, msg  ) {
          return parseLocation ( name, col, msg );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseFooter: function ( footer ) {
          return parseFooter( footer );
        },
        parseEnd: function () {
          return parseEnd ();
        }
      };
    })();

    /* Parses the given text into a JSON format. Note that it allows for
    *  trailing commas by ECMA standard. THIS WILL NOT WORK IN IE AS OF
    *  NOW.
    */
    var JSONParser = (function () {
      //Private helper function for bracket formatting
      function bracket ( indent, brace ) {
        return indentBy(indent) + brace + linefeed;
      }

      function parseStart () {
        var inline_offenses_object = '{ "inline-offenses": {' + linefeed,
            offensive_files_object = indentBy(1) + '"offensive-files": [' +
                                        linefeed;
        return inline_offenses_object + offensive_files_object;
      }

      function parseHeader ( filepath ) {
        var filepath_object = indentBy(3) + '"filepath": "' + filepath + '",' +
                                linefeed,
            offensive_line_object = indentBy(3) + '"offensive-line": [' +
                                    linefeed;
        return bracket(2,'{') + filepath_object +
                offensive_line_object;
      }

      function parseStartLine ( line_num ) {
        var line_number_object = indentBy(5) + '"line-number": ' + line_num +
            ',' + linefeed,
            offensive_column_object = indentBy(5) + '"offensive-column": [' +
                                      linefeed;
        return bracket(4,'{') + line_number_object + offensive_column_object;
      }

      function parseLocation ( column_type, column_num, column_message ) {
        var type_object = indentBy(7) + '"type": "' + column_type +
                        '",' + linefeed,
            col_object = indentBy(7) + '"column": ' + column_num + ',' +
                          linefeed,
            msg_object = indentBy(7) + '"message": "' + column_message +
                          '"' + linefeed,
            offense_object = bracket(6,'{') + type_object + col_object +
                              msg_object + bracket(6,'},');
        return offense_object;
      }

      function parseSource ( line ) {
        var offensive_column_close = indentBy(5) + '],' + linefeed,
            line_object = indentBy(5) + '"line": "' + line + '"' + linefeed;
        return offensive_column_close + line_object;
      }

      function parseEndLine () {
        return bracket(4,'},');
      }

      function parseFooter ( total ) {
        var offensive_line_close = indentBy(3) + '],' + linefeed,
            total_offenses_object = indentBy(3) + '"total-offenses": ' +
                                    total + linefeed;
        return offensive_line_close + total_offenses_object + bracket(2,'},');
      }

      function parseEnd () {
        var offensive_files_close = indentBy(1) + ']' + linefeed;
        return offensive_files_close + '} }';
      }

      return {
        parseStart: function () {
          return parseStart ();
        },
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function ( row ) {
          return parseStartLine ( row );
        },
        parseLocation: function ( name, col, msg  ) {
          return parseLocation ( name, col, msg );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseFooter: function ( footer ) {
          return parseFooter( footer );
        },
        parseEnd: function () {
          return parseEnd ();
        }
      };
    })();


    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Reader object that reads a collections of files using a source and a
    *  parser object.
    *  In more detail, this reader accesses each input file to get the required
    *  information it needs from it and then parses it into a format
    *  dictated by the injected parser.
    *
    *  Interface Reader {
    *    read ( input, parser );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingFilesReader = (function () {

      function readEachColumn ( offending_line, parser ) {
        var offending_column,
            column_number,
            column_type,
            column_message,
            output = '';
        while (offending_line.hasNext()) {
          offending_column = offending_line.getNext();
          column_number = offending_column.getColumnNumber();
          column_type = offending_column.getOffenseType();
          column_message = offending_column.getMessage();
          output += parser.parseLocation(column_type,
                                          column_number,
                                          column_message);
        }
        offending_line.resetPointer();
        return output;
      }

      function readEachLine ( offending_file, parser ) {
        var filepath,
            offending_line,
            line,
            line_num,
            output;
        filepath = offending_file.getFilePath();
        output = parser.parseHeader(filepath);
        if(offending_file.getLength() === 0) {
          output += parser.parseFooter(offending_file.getTotalOffenses());
        } else {
          while (offending_file.hasNext()) {
            offending_line = offending_file.getNext();
            line = offending_line.getLine();
            line_num = offending_line.getLineNumber();
            output += parser.parseStartLine(line_num) +
                      readEachColumn(offending_line, parser);
            output += parser.parseSource(line) + parser.parseEndLine();
          }
          offending_file.resetPointer();
          output += parser.parseFooter(offending_file.getTotalOffenses());
        }
        return output;
      }

      function readEachFile ( assembled_files_collection, parser ) {
        var parsed_files_collection = new Collection(),
            parsed_file;
        parsed_files_collection.addElement(parser.parseStart());
        while (assembled_files_collection.hasNext()){
            parsed_file = readEachLine(assembled_files_collection.getNext(),
                                      parser);
            parsed_files_collection.addElement(parsed_file);
          }
          assembled_files_collection.resetPointer();
        parsed_files_collection.addElement(parser.parseEnd());
        return parsed_files_collection;
      }

      return {
        read: function ( input, parser ) {
          return readEachFile( input, parser );
        }
      };
    })();

    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Reporter object that takes an input and reports it to standard output
    *  and/or an output file.
    *
    *  Interface Reporter {
    *    report ( destination, input, [options,]);
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var Reporter = (function () {

      function reportParsedFiles ( dest, input, to_file ) {
        var parsed_file,
            output_file = '';
        while (input.hasNext()) {
          parsed_file = input.getNext();
          if(to_file) {
            output_file += parsed_file;
          } else {
            grunt.log.write(parsed_file); 
          }
        }
        input.resetPointer();
        if(to_file) {
          grunt.file.write(dest.dest, output_file);
          grunt.log.writeln(('File "' + dest.dest + '" created.').white.bold);
        }
      }

      return {
        report: function ( destination, input, to_file ) {
          reportParsedFiles (destination, input, to_file);
          return true;
        }
      };

    })();

    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Client object that executes all parts of the plugin while also taking
    *  into account user-defined options.
    *
    *  Interface Client {
    *    execute ();
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var Client = (function () {

      /* Loads the files given by the user in and saves their filepath and data
      *  in a collection.
      *
      *  @param file_block:  The "output: input" element of the files object
      *                      provided through the gruntfile that will be read.
      *
      *  returns             A collection containing the filepath and data of
      *                      each file.
      */
      function fileLoader ( file_block ) {
        var input_files_collection = new Collection(),
            files = file_block.src.filter( function ( filepath ) {
              if (!grunt.file.exists(filepath)) {
                grunt.log.writeln('Source file "' + filepath + '" not found.');
                return false;
              } else {
                return true;
              }
            });
        for(var filepath in files){
            input_files_collection.addElement({
                                        path: files[filepath],
                                        data: grunt.file.read(files[filepath])
                                              });
        }
        return input_files_collection;
      }

      /* A case/switch function that determines which parser to use given
      *  the option provided by the user. It will default to the
      *  Decorated PlainText Parser on any erroneous or undefined option.
      *
      *  @param tag:  The user option that determines the parser to be used.
      *
      *  returns      The parser object that corresponds with the parameter.
      */
      function parserSwitch ( tag ) {
        var parser;
        switch (tag.toString().toLowerCase())
        {
          case 'json':
            parser = JSONParser;
            break;
          case 'xml':
            parser = MinimalXMLParser;
            break;
          case 'plaintext':
            parser = PlainTextParser;
            break;
          case 'decoratedplaintext':
            parser = DecoratedPlainTextParser;
            break;
          default:
            parser = PlainTextParser;
        }
        return parser;
      }

      /* Checks for undefined or erroneous options and gives them
      *  default values. Will be replaced later with cleaner code
      */
      function undefinedToDefault () {
        if(options.to_file === undefined &&
           options.to_file !== false){
          options.to_file = true;
        }
        if(options.finder === undefined){
          options.finder = {};
        }
        if(options.finder.override === undefined ||
           typeof options.finder.override !== 'boolean'){
          options.finder.override = false;
        }
        if(options.finder.force === undefined ||
           typeof options.finder.force !== 'boolean'){
          options.finder.force = true;
        }
      }

      /* Builds the collection that holds all the files with their
      *  assembled data on offenses. Each assembled file is created
      *  using the OffendingFileDataAssembler object assemble() function.
      *
      *  @param collection:  The collection of input files to be used for
      *                      assembling the offense data.
      *
      *  returns             A collection of all the assembled offense data.
      */
      function buildAssembledFilesCollection ( collection ) {
        var assembled_file,
            assembled_files_collection = new Collection();
        while (collection.hasNext()) {
          assembled_file = 
            OffendingFileDataAssembler.assemble(
              collection.getNext(),
              OffendingColumnsByLineFinder);
          assembled_files_collection.addElement(assembled_file);
        }
        collection.resetPointer();
        return assembled_files_collection;
      }

      /* Runs the needed functions of this js file given by the user options
      *  and/or default options of the gruntfile.
      */
      function run () {
        _self.files.forEach( function ( file_block ) {
          var assembled_files_collection,
              parsed_files_collection,
              input_files_collection = fileLoader(file_block);
          if(input_files_collection.getLength() > 0) {

            undefinedToDefault();

            assembled_files_collection =
                  buildAssembledFilesCollection(input_files_collection);

            parsed_files_collection = OffendingFilesReader.read(
                                  assembled_files_collection,
                                  parserSwitch(options.reporter.stout ||
                                               'default'));
            Reporter.report(file_block, parsed_files_collection);

            if(options.to_file === true &&
               options.to_file.length === undefined) {
              parsed_files_collection = OffendingFilesReader.read(
                                  assembled_files_collection,
                                  parserSwitch(options.reporter.output ||
                                               'default'));
              Reporter.report(file_block,
                                      parsed_files_collection,
                                      true);
            }
          }
        });
      }

      return {
        execute: function () {
          run ();
        }
      };
    })();

    //Command to execute the gruntfile js functions.
    Client.execute();
  });

};