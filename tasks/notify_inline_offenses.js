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

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      reporter: {
        tag: 'default',
        to_file: true,
      }
    });

    //Line formatting using grunt's cross-browser linefeed utility.
    var linefeed = grunt.util.linefeed,
        block_space = linefeed + linefeed + linefeed,
        hr = '______________________________________________________' +
          linefeed;

    /* Helper function to indent a line by a number of \s characters to
    *  to make the output more readable.
    */
    function indentBy ( amount ) {
      var indent = '',
          it = 0;
      while (it < amount) {
        indent = indent + ' ';
        it++;
      }
      return indent;
    }
    

    function Collection ( array ) {
      this._pointer = 0;
      this._collection = array || [];
      this._current_element = null;
    }
    Collection.prototype.addElement = function ( element ) {
      if(this._collection.length === 0) { this._current_element = element; }
      this._collection.push(element);
    };
    Collection.prototype.getElement = function ( index ) {
      if (index >= 0 && index < this._collection.length) {
        return this._collection[index];
      } else {
        return -1;
      }
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
    Collection.prototype.getCurrent = function () {
      if(this._current_element !== null) { return this._current_element; }
      else { return -1; }
    };
    Collection.prototype.resetPointer = function () {
    this._pointer = 0;
    if(this._collection.length > 0) {
      this._current_element = this._collection[0];
    }
    return true;
    };

    function OffendingAssembled ( path ) {
      Collection.call( this );
      this._path = path;
      
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
    OffendingAssembled.prototype = new Collection();


    /* OffendingFile "class" for creating OffendingFile objects which
    *  contains the filepath and a collection of the offending lines in an
    *  offenses array needed to read and parse later. These objects are later
    *  contained in an offenses collection object.
    *
    *  @param path: the path to the file in which the extracted
    *               data pertains to
    */
    function OffendingFile ( path ) {
      Collection.call( this );
      this._path = path;
      
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

    /* OffendingLine "class" for creating OffendingLine objects which
    *  contains the offense information needed to read and parse later. These
    *  objects are later collected in a OffendingLine object's offenses
    *  array.
    *
    *  @param line: the line that contains offenses
    *  @param line_num: the line number of the offending line in the
    *                   offending file
    *  @param columns: the collection of offending columns in the line
    */
    function OffendingLine ( line, line_num ) {
      Collection.call( this );
      this._line = line;
      this._line_num = line_num;

      this.getLine = function () {
        return this._line;
      };
      this.getLineNumber = function () {
        return this._line_num;
      };
    }
    OffendingLine.prototype = new Collection();

    /* OffendingColumn "class" for creating OffendingColumn objects that
    *  contains the type and column number. These will eventually be read
    *  and parsed by a reader.
    *
    *  @param type: the type of the offense starting at the column
    *  @param column: the column number where the offense begins
    */
    function OffendingColumn ( type, column ) {
      this.type = type;
      this.column = column;
    }
    OffendingColumn.prototype.getColumnType = function () {
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
    *    find ( source, item );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingColumnsFinder = (function () {

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

      var tabwidth = 8;

      /* Helper function to convert all tab indentation into spaces equivalent
      *  to the tab width based on the indentation option. This works in
      *  tandem with the indentation option of JSHint so columns will be
      *  calculated based on a correctly linted file.
      *
      *  @param c: the number of \s characters to set the tab width to
      */
      function convertTabToTabWidth ( c ) {
        var spaces_in_tabwidth = '',
            characters = c;
        if(typeof characters === "string") { characters = +(characters); } 
        for (var i = 0; i < characters; i++) {
          spaces_in_tabwidth = spaces_in_tabwidth + ' ';
        }
        return spaces_in_tabwidth;
      }

      function doesTypeExist (type) {
        var index = 0,
            exists = false;
        while (index < patterns.length && !exists) {
          if(patterns[index].type === type){
            exists = true;
          }
        }
        return exists;
      }

      function getPattern (type) {
        var index = 0,
            exists = false,
            pattern = -1;
        while (index < patterns.length && !exists) {
          if(patterns[index].type === type){
            exists = true;
            pattern = patterns[index].pattern;
          }
        }
        return pattern;
      }

      /* Finds all the columns of the offenses by returning the starting
      *  index of said offense + 1 to offset array indexing. Each column of
      *  an offense is creates a Column object that holds the type of offense
      *  and the column number and is pushed into a collection of columns.
      *
      *  @param line: a line in a file to be searched for offending columns
      *  @param type: the type of offense to search for in the given line
      *  @param pattern [optional]: a pattern to search for as an offense
      *                             in the given line
      */
      function findOffendingColumns ( line, type, pattern ) {
          var style_pattern,
              result,
              columns = [],
              //Converts all tab indentations into the specified tab width
              new_tab_line = line.replace(/^\t/,
                                         convertTabToTabWidth(tabwidth));
          if(pattern === undefined) {
            if(doesTypeExist(type)){
              style_pattern = getPattern(type);
            } else {
              return [];
            }
          } else {
            style_pattern = pattern;
          }
          while ( (result = style_pattern.exec(new_tab_line)) ) {
                columns.push(new OffendingColumn(type, result.index + 1));
          }
          return columns;
        }

      return {
        find: function ( source, item ) {
          if(item === undefined) {
            var columns = [];
            for (var i in patterns) {
              columns = columns.concat(findOffendingColumns
                                              (source,
                                                patterns[i].type,
                                                patterns[i].pattern));
            }
            return columns;
          }
          return findOffendingColumns (source, item.type, item.pattern);
        },
        changeTabWidth: function ( newtabwidth ) {
          var new_tabwidth;
          if (typeof newtabwidth === "string" ) {
            new_tabwidth = +(newtabwidth);
          } else {
            new_tabwidth = newtabwidth;
          }
          tabwidth = new_tabwidth;
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
    *    assemble ( base, [part,] );
    *    getLength ();
    *    getElement ( index );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingFileDataAssembler = (function () {

      var offending_files_collection = null;

      /* Assembles an offending file's data by combining, as parts,
      *  the offending file, the offending line and offending columns into a
      *  comprehensive object that is then inserted into the base collection.
      *  @param file: the offending file from the given path to be assembled
      *               with the attained data.
      *  @param finder: the finder object that gives the collection of
      *                 offending columns.
      */
      function assembleOffensesCollection ( file, finder ) {
          var offending_line,
              offending_columns,
              lines = file.data.split(linefeed),
              offending_file = new OffendingFile(file.path);
          for(var j in lines){
            if(lines[j].length > 0) {
              offending_columns =
                finder.find(lines[j]);
              if(offending_columns.length > 0) {
                offending_line = new OffendingLine(lines[j].trim(),
                                                   (+j) + 1);
                for (var i in offending_columns) {
                  offending_line.addElement(offending_columns[i]);
                }
                offending_file.addElement(offending_line);
              } } }
          return offending_file;
      }

    return {
      assemble: function ( base, part ) {
        return assembleOffensesCollection(base, part);
      }
    };

    })();

    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Parser objects for parsing the offenses for the reporter.
    *
    *  Interface Parser {
    *    parseHeader ( header );
    *    parseStartLine ();
    *    parseLocation ( name, row, col );
    *    parseSource ( source );
    *    parseEndLine ();
    *    parseEnd ( footer );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/

    /*Parses the given text into a plaintext format and returns that*/
    var PlainTextParser = (function () {

      function parseHeader ( filepath ) {
        var check_file_text = linefeed +
                '[Checking for offenses in file: ' + filepath + ']';
        return linefeed + check_file_text + linefeed;
      }

      function parseStartLine () {
        return hr;
      }

      function parseLocation ( column_type, line_num, column_num ) {
        var arrow_text = '-> ',
            location_text = 'L' + line_num + ' C' + column_num;
        return arrow_text + column_type +
                ' attribute located at: ' + location_text + '.' + linefeed;
      }

      function parseSource ( line ) {
        return 'Offending line: ' + line + linefeed;
      }

      function parseEndLine () {
        return hr;
      }
      function parseEnd ( total ) {
        return 'Number of Offenses: ' + total + block_space;
      }

      return {
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( name, row, col  ) {
          return parseLocation ( name, row, col );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( footer ) {
          return parseEnd ( footer );
        }
      };
    })();

    /*Parses the given text into a colorful plaintext format and returns that*/
    var FormattedPlainTextParser = (function () {

      function parseHeader ( filepath ) {
        var check_file_text = linefeed +
                ('[Checking for offenses in file: ' + filepath +
                 ']').magenta.bold;
        return linefeed + check_file_text + linefeed;
      }

      function parseStartLine () {
        return hr;
      }

      function parseLocation ( column_type, line_num, column_num ) {
        var arrow_text = ('-> ').yellow.bold,
            location_text = ('L' + line_num + ' C' + column_num).bold.white;
        return arrow_text + column_type +
                ' attribute located at: ' + location_text + '.' + linefeed;
      }

      function parseSource ( line ) {
        return ('Offending line: ').red.bold  + line + linefeed;
      }

      function parseEndLine () {
        return  hr;
      }

      function parseEnd ( total ) {
        //Add empty string to total to convert to a String and use formatting
        return 'Number of Offenses: ' + (total+'').green.bold + block_space;
      }

      return {
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( name, row, col  ) {
          return parseLocation ( name, row, col );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( footer ) {
          return parseEnd ( footer );
        }
      };
    })();

    /*Parses the given text into a XML format and returns that*/
    var MinimalXMLParser = (function () {

      function parseHeader ( filepath ) {
        var start_file_tag = '<file>' + linefeed,
            start_header_tag = indentBy(1) + '<header>' + linefeed,
            filepath_tag = indentBy(2) + '<filepath>' + filepath +
                            '</filepath>' + linefeed,
            end_header_tag = indentBy(1) + '</header>' + linefeed,
            start_body_tag = indentBy(1) + '<body>' + linefeed;
        return start_file_tag + start_header_tag + filepath_tag +
                end_header_tag + start_body_tag;
      }

      function parseStartLine () {
        var start_line_tag = indentBy(2) + '<line>' + linefeed;
        return start_line_tag;
      }

      function parseLocation ( column_type, line_num, column_num ) {
        var type_tag = indentBy(4) + '<type>' + column_type + '</type>' +
                        linefeed,
            row_tag = indentBy(4) + '<row>' + line_num + '</row>' + linefeed,
            col_tag = indentBy(4) + '<col>' + column_num + '</col>' + linefeed,
            offense_tag = indentBy(3) + '<offense>' + linefeed + type_tag +
                          row_tag + col_tag + indentBy(3) + '</offense>' +
                          linefeed;
        return offense_tag;
      }

      function parseSource ( line ) {
        var offending_line_tag = indentBy(3) + '<offendingLine>' +
                              'Offending line: ' + line + '</offendingLine>' +
                              linefeed;
        return offending_line_tag;
      }

      function parseEndLine () {
        var end_line_tag = indentBy(2) + '</line>' + linefeed;
        return end_line_tag;
      }

      function parseEnd ( total ) {
        var end_body_tag = indentBy(1) + '</body>' + linefeed,
            start_footer_tag = indentBy(1) + '<footer>' + linefeed,
            total_offenses_tag = indentBy(2) + '<totalOffenses>' + total +
                              '</totalOffenses>' + linefeed,
            end_footer_tag = indentBy(1) + '</footer>' + linefeed,
            end_file_tag = '</file>' + linefeed;

        return end_body_tag + start_footer_tag + total_offenses_tag +
                end_footer_tag + end_file_tag;
      }

      return {
        parseHeader: function ( header ) {
          return parseHeader ( header );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( name, row, col  ) {
          return parseLocation ( name, row, col );
        },
        parseSource: function ( source ) {
          return parseSource ( source );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( footer ) {
          return parseEnd ( footer );
        }
      };
    })();


    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Reader object that reads a file using a source and a parser object.
    *  In more detail, this reader accesses assembler to get the required
    *  information it needs from a file and then parses it into a format
    *  dictated by the injected parser.
    *
    *  Interface Reader {
    *    
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var OffendingFilesReader = (function () {

      var parsed_files_collection = null;

      function readEachColumn ( offending_line, line_num, parser ) {
        var offending_column,
            column_number,
            column_type,
            output = '';
        while (offending_line.hasNext()) {
          offending_column = offending_line.getNext();
          column_number = offending_column.getColumnNumber();
          column_type = offending_column.getColumnType();
          output += parser.parseLocation(column_type,
                                          line_num,
                                          column_number);
        }
        offending_line.resetPointer();
        return output;
      }

      function readEachLine ( offending_file, parser ) {
        var offending_line,
            line,
            line_num,
            output = '';
        while (offending_file.hasNext()) {
          offending_line = offending_file.getNext();
          line = offending_line.getLine();
          line_num = offending_line.getLineNumber();
          output += parser.parseStartLine() + readEachColumn(offending_line,
                                                             line_num,
                                                             parser);
          output += parser.parseSource(line) + parser.parseEndLine();
        }
        offending_file.resetPointer();
        return output;
      }

      function readEachFile ( input, parser ) {
        var offending_file,
            output,
            filepath,
            outputs = [];
        while(input.hasNext()) {
          offending_file = input.getNext();
          filepath = offending_file.getFilePath();
          output = parser.parseHeader(filepath);
          if(offending_file.getLength() === 0) {
            output += parser.parseEnd(offending_file.getTotalOffenses());
          } else {
            output += readEachLine( offending_file, parser ) +
                      parser.parseEnd(offending_file.getTotalOffenses());
          }
          outputs.push(output);
        }
        input.resetPointer();
        return outputs;
      }

      return {
        read: function ( input, parser ) {
          parsed_files_collection = readEachFile( input, parser );
          return true;
        },
        getParsedFile: function ( file_index ) {
          return parsed_files_collection[file_index];
        },
        getParsedFilesLength: function () {
          if (parsed_files_collection !== null) {
            return parsed_files_collection.length;
          } else { return -1; }
        }
      };
    })();

    /*Takes the parsed results array that represents each input file and
    outputs them either to standard output or to a specified output file from
    the options.*/
    var Reporter = (function () {

      function outputReadFiles ( dest, reader, toFile ) {
        var output_file = '',
            parsed_file,
            it = 0;
        while (it < reader.getParsedFilesLength()) {
          parsed_file = reader.getParsedFile(it);
          if(toFile) {
            output_file = output_file + parsed_file;
          } else {
            grunt.log.write(parsed_file); 
          }
          it++; 
        }
        if(toFile) {
          grunt.file.write(dest.dest, output_file);
          grunt.log.writeln(('File "' + dest.dest + '" created.').white.bold);
        }
      }

      return {
        customOutputOffenses: function ( customOutput ) {
          customOutput();
        },
        outputOffenses: function ( dest, reader, toFile ) {
          outputReadFiles (dest, reader, toFile);
          return true;
        }
      };

    })();

    this.files.forEach( function ( file_block ) {
      var files = file_block.src.filter( function ( filepath ) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.writeln('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        });
        var input_files_collection = new Collection(),
            assembled_file,
            assembled_files_collection;
        for(var filepath in files){
          input_files_collection.addElement({
                                        path: files[filepath],
                                        data: grunt.file.read(files[filepath])
                                            });
        }
        if(files.length > 0){
          if(options.reporter.to_file === undefined){
            options.reporter.to_file = true;
          }
          if(options.reporter.tag === (undefined || 'default')) {
            OffendingColumnsFinder.changeTabWidth(4);
            assembled_files_collection = new Collection();
            while (input_files_collection.hasNext()) {
              assembled_file = 
                OffendingFileDataAssembler.assemble(
                  input_files_collection.getNext(),
                  OffendingColumnsFinder);
              assembled_files_collection.addElement(assembled_file);
            }
            input_files_collection.resetPointer();
            OffendingFilesReader.read(assembled_files_collection,
                                      FormattedPlainTextParser);
            Reporter.outputOffenses(file_block, OffendingFilesReader);
            if(options.reporter.to_file === true &&
               options.reporter.to_file.length === undefined) {
              OffendingFilesReader.read(assembled_files_collection,
                                        MinimalXMLParser);
              Reporter.outputOffenses(file_block, OffendingFilesReader, true);
            }
          } else {
            Reporter.customOutputOffenses(function() {grunt.log.writeln('hi');});
          }
        }
      });
  });

};