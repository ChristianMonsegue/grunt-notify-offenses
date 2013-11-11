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
      to_file: false,
      reporter: {
        stout: 'default',
        output: 'default'
      },
      finder: {
        offenses: {
          "CSS": [],
          "Align": []
        }
      },
      assembler: {
        tabwidth: 4
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
    *  @param amount: the number of \s characters multiplied by 2 to indent
    *                 by
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

    /* Helper function to convert all tab indentation into spaces equivalent
    *  to the tab width based on the indentation option. This works in
    *  tandem with the indentation option of JSHint so columns will be
    *  calculated based on a correctly linted file.
    *
    *  @param chars: the number of \s characters to set the tab width to
    */
    function convertTabToTabWidth ( chars ) {
      var spaces_in_tabwidth = '';
      for (var i = 0; i < chars; i++) {
        spaces_in_tabwidth += ' ';
      }
      return spaces_in_tabwidth;
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
    *  files.
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
    *  stored in a collection object.
    *
    *  Extends: Collection
    *
    *  @param path: the path to the file in which the extracted
    *               data pertains to
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
    *
    *  Extends: Collection
    *
    *  @param line: the line that contains offenses
    *  @param line_num: the line number of the offending line in the
    *                   offending file
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
    *  contains the type and column number. These objects are later
    *  stored in an OffendingLine object as a collection.
    *
    *  @param type: the type of the offense starting at the column
    *  @param column: the column number where the offense begins
    */
    function OffendingColumn ( type, column ) {
      this.type = type || 'No type defined';
      this.column = column || -1;
    }
    OffendingColumn.prototype.getOffenseType = function () {
      return this.type;
    };
    OffendingColumn.prototype.getColumnNumber = function () {
      return this.column;
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
      var patterns =
      [
        {
          type: 'CSS',
          pattern: /style[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\$_\"\']*(\"|\')/gi
        },
        {
          type: 'Align',
          pattern: /align[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\$_\"\']*(\"|\')/gi
        }
      ];

      function doesTypeExist (type) {
        var index = 0,
            exists = false;
        while (index < patterns.length && !exists) {
          if(patterns[index].type.toUpperCase() === type.toUpperCase()){
            exists = true;
          }
          index++;
        }
        return exists;
      }

      function getPattern (type) {
        var index = 0,
            exists = false,
            pattern = -1;
        while (index < patterns.length && !exists) {
          if(patterns[index].type.toUpperCase() === type.toUpperCase()){
            exists = true;
            pattern = patterns[index].pattern;
          }
          index++;
        }
        return pattern;
      }

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
                        ':__:' + columns[i].getColumnNumber()] = 0;
        }
        for(var type in no_duplicates) {
          col_data = type.split(':__:');
          no_dup_cols.push(new OffendingColumn(col_data[0], col_data[1]));
        }
        return no_dup_cols;
      }

      function escapeAllQuotes ( pattern ) {
        var escaped_pattern = pattern.replace(/\'/g,"\\'");
        return escaped_pattern.replace(/\"/g,'\\"');
      }

      /* Finds all the columns of the given offense by returning the starting
      *  index of said offense + 1 to offset array indexing. Each column of
      *  an offense creates a Column object that holds the type of offense
      *  and the column number. Additionally, each Column object is pushed
      *  into an array of columns.
      *
      *  @param line: a line in a file to be searched for offending columns
      *  @param type: the type of offense to search for in the given line
      *  @param pattern [optional]: a pattern to search for as an offense
      *                             in the given line
      */
      function findOffendingColumns ( line, type, pattern ) {
          var style_pattern,
              result,
              pattern_modifiers = ['g', 'i'],
              columns = [];
          if(Array.isArray(pattern) && pattern.length > 0 &&
              !doesTypeExist(type)) {
            if(pattern.length > 1){
              pattern_modifiers = getModifiers(pattern.slice(1));
            }
            style_pattern = new RegExp(escapeAllQuotes(pattern[0]),
                                        pattern_modifiers.join(''));
          } else {
            if(doesTypeExist(type)){
              style_pattern = getPattern(type);
            } else {
              return columns;
            }
          }
          while ( (result = style_pattern.exec(line)) ) {
                columns.push(new OffendingColumn(type.toUpperCase(),
                                                  result.index + 1));
          }
          return columns;
        }

      /* Regulates the creation of the list of offending columns by checking
      *  if there is a user-defined set of offenses to look for and if there
      *  is, search for those first before searching for the pre-defined
      *  offenses. Note that user-defined offense types are matched as
      *  case-insensitive, so "css" = "CSS".
      *
      *  @param line: a line in a file to be searched for offending columns
      *  @param offenses [optional]: a list of objects or a single object that
      *                              a user provides with defined types and
      *                              patterns.
      */
      function createOffendingColumnsList ( line, offenses ) {
        var merge_columns,
            columns = [],
            force = false;
        //If user-defined offenses are given, process those first
        if(offenses !== undefined) {
          
          for (var type in offenses) {
            if (!offenses.hasOwnProperty(type)) { continue; }
            merge_columns = findOffendingColumns(line,
                                                    type,
                                                    offenses[type]);
            columns = columns.concat(merge_columns);
          }
        }
        /* Default search for pre-defined offenses from the patterns object.
        *  This search only occurs if the user does not give user-defined
        *  offenses or if they set the 'force' option to true, which always
        *  through the pre-defined offenses regardless of the presence of
        *  user-defined offenses.
        */
        if(offenses === undefined ||
          (offenses !== undefined && options.finder.force === true)) {
          force = true;
          for (var j in patterns) {
              merge_columns = findOffendingColumns(line,
                                                    patterns[j].type,
                                                    patterns[j].pattern);
              columns = columns.concat(merge_columns);
          }
        }
        if(offenses === undefined || options.finder.force === false) {
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

      /* Assembles an offending file's data by combining, as parts,
      *  the offending file, the offending line and offending columns into a
      *  comprehensive data object.
      *  @param file: the offending file from the given path to be assembled
      *               with the attained data.
      *  @param finder: the finder object that gives the collection of
      *                 offending columns.
      */
      function assembleOffenseData( file, finder ) {
          var offending_line,
              offending_columns,
              new_tab_line,
              lines = file.data.split(linefeed),
              offending_file = new OffendingFile(file.path);
          for(var j in lines){
            //Converts all tab indentations into the specified tab width
            new_tab_line = lines[j].replace(/^\t/,
                                         convertTabToTabWidth(
                                                options.assembler.tabwidth));
            if(new_tab_line.trim().length > 0) {
              offending_columns =
                finder.find(new_tab_line, options.finder.offenses);
              if(offending_columns.length > 0) {
                offending_line = new OffendingLine(new_tab_line.trim(),
                                                   (+j) + 1);
                for (var i in offending_columns) {
                  offending_line.addElement(offending_columns[i]);
                }
                offending_file.addElement(offending_line);
              } } }
          return offending_file;
      }

    return {
      assemble: function ( base, operator ) {
        return assembleOffenseData(base, operator);
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
    *    parseLocation ( name, col );
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
        return linefeed;
      }

      function parseHeader ( filepath ) {
        var check_file_text = 
              '[Checking for offenses in file: ' + filepath + ']';
        return block_space + check_file_text + linefeed;
      }

      function parseStartLine ( line_num ) {
        return hr + 'Offenses located at line number: L' + line_num +
                linefeed + hr;
      }

      function parseLocation ( column_type,  column_num ) {
        var arrow_text = indentBy(2) + '-> ',
            location_text = 'C' + column_num;
        return arrow_text + column_type +
                ' attribute located at column: ' + location_text + '.' +
                linefeed;
      }

      function parseSource ( line ) {
        return 'Offending line: ' + line + linefeed;
      }

      function parseEndLine () {
        return hr + block_space;
      }
      function parseFooter ( total ) {
        //Add empty string to total to convert to a String and use formatting
        return 'Number of Offenses: ' + total + block_space;
      }

      function parseEnd () {
        return linefeed;
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
        parseLocation: function ( name, col  ) {
          return parseLocation ( name, col );
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
        return linefeed;
      }

      function parseHeader ( filepath ) {
        var check_file_text =
            ('[Checking for offenses in file: ' + filepath +']').magenta.bold;
        return block_space + check_file_text + linefeed;
      }

      function parseStartLine ( line_num ) {
        return hr + 'Offenses located at line number: ' +
                ('L' + line_num).white.bold + linefeed + hr;
      }

      function parseLocation ( column_type, column_num ) {
        var arrow_text = indentBy(2) + ('-> ').yellow.bold,
            location_text = ('C' + column_num).white.bold;
        return arrow_text + column_type +
                ' attribute located at column: ' + location_text + '.' +
                linefeed;
      }

      function parseSource ( line ) {
        return ('Offending line: ').red.bold  + line + linefeed;
      }

      function parseEndLine () {
        return  hr + block_space;
      }
      function parseFooter ( total ) {
        //Add empty string to total to convert to a String and use formatting
        return 'Number of Offenses: ' + (total+'').green.bold + block_space;
      }

      function parseEnd () {
        return linefeed;
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
        parseLocation: function ( name, col  ) {
          return parseLocation ( name, col );
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

      function parseLocation ( column_type, column_num ) {
        var type_tag = indentBy(4) + '<type>"' + column_type +
                        '"</type>' +
                        linefeed,
            col_tag = indentBy(4) + '<column>' + column_num +
                      '</column>' + linefeed,
            offense_tag = indentBy(3) + '<offensiveColumn>' + linefeed +
                          type_tag + col_tag + indentBy(3) +
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
        parseLocation: function ( name, col  ) {
          return parseLocation ( name, col );
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

      function parseLocation ( column_type, column_num ) {
        var type_object = indentBy(7) + '"type": "' + column_type +
                        '",' + linefeed,
            col_object = indentBy(7) + '"column": ' + column_num + linefeed,
            offense_object = bracket(6,'{') + type_object + col_object +
                          bracket(6,'},');
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
        parseLocation: function ( name, col  ) {
          return parseLocation ( name, col );
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
            output = '';
        while (offending_line.hasNext()) {
          offending_column = offending_line.getNext();
          column_number = offending_column.getColumnNumber();
          column_type = offending_column.getOffenseType();
          output += parser.parseLocation(column_type,
                                          column_number);
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

      function undefinedToDefault () {
        if(options.to_file === undefined &&
           options.to_file !== false){
          options.to_file = true;
        }
        if(options.reporter.stout === undefined ||
           options.reporter.stout === false){
          options.reporter.stout = 'default';
        }
        if(options.reporter.output === undefined ||
           options.reporter.output === false){
          options.reporter.output = 'default';
        }
        if(options.finder === undefined){
          options.finder = {};
        }
        if(options.finder.force === undefined ||
           typeof options.finder.force !== 'boolean'){
          options.finder.force = true;
        }
        if(options.assembler === undefined){
          options.assembler = {};
        }
        if(options.assembler.tabwidth === undefined ||
           typeof options.assembler.tabwidth !== 'number'){
          options.assembler.tabwidth = 4;
        }
      }

      function run () {
        _self.files.forEach( function ( file_block ) {
          var input_files_collection = fileLoader(file_block),
              assembled_file,
              parsed_file,
              assembled_files_collection,
              parsed_files_collection;
          if(input_files_collection.getLength() > 0) {
            undefinedToDefault();

            assembled_files_collection = new Collection();
              while (input_files_collection.hasNext()) {
                assembled_file = 
                  OffendingFileDataAssembler.assemble(
                    input_files_collection.getNext(),
                    OffendingColumnsByLineFinder);
                assembled_files_collection.addElement(assembled_file);
              }
            input_files_collection.resetPointer();

            parsed_files_collection = OffendingFilesReader.read(
                                  assembled_files_collection,
                                  parserSwitch(options.reporter.stout));
            Reporter.report(file_block, parsed_files_collection);

            if(options.to_file === true &&
               options.to_file.length === undefined) {
              parsed_files_collection = OffendingFilesReader.read(
                                  assembled_files_collection,
                                  parserSwitch(options.reporter.output));
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

    Client.execute();
  });

};