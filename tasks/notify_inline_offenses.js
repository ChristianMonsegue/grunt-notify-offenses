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


    
    /* OffendingColumn "class" for creating OffendingColumn objects that
    *  contains the type and column number.
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

    /* Finder object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types.
    *
    *  Interface Finder {
    *    find ( source, item );
    *  }
    */
    var OffendingColumnFinder = (function () {

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

    /* OffendingFile "class" for creating OffendingFile objects which
    *  contains the filepath and a collection of the offending lines in an
    *  offenses array needed to parse later. These objects are later
    *  contained in an offenses collection object.
    *
    *  @param path: the path to the file in which the extracted
    *               data pertains to
    */
    function OffendingFile (path) {
      this.path = path;
      this.offending_lines = [];
      
      this.getTotalOffenses = function () {
        var total = 0;
        for (var e in this.offending_lines) {
          total += this.offending_lines[e].getColumnsLength();
        }
        return total;
      };
    }
    OffendingFile.prototype.getFilePath = function () {
      return this.path;
    };
    OffendingFile.prototype.getOffendingLinesLength = function () {
      return this.offending_lines.length;
    };
    OffendingFile.prototype.getOffendingLine = function ( index ) {
      return this.offending_lines[index];
    };
    OffendingFile.prototype.addOffendingLine = function ( offending_line ) {
      return this.offending_lines.push(offending_line);
    };

    /* OffendingLine "class" for creating OffendingLine objects which
    *  contains the offense information needed to parse later. These
    *  objects are later collected in a OffendingLine object's offenses
    *  array.
    *
    *  @param line: the line that contains offenses
    *  @param line_num: the line number of the offending line in the
    *                   offending file
    *  @param columns: the collection of offending columns in the line
    */
    function OffendingLine ( line, line_num, columns ) {
      this.line = line;
      this.line_num = line_num;
      this.columns = columns;
    }
    OffendingLine.prototype.getLine = function () {
      return this.line;
    };
    OffendingLine.prototype.getLineNumber = function () {
      return this.line_num;
    };
    OffendingLine.prototype.getColumns = function () {
      return this.columns;
    };
    OffendingLine.prototype.getColumn = function ( index ) {
      return this.columns[index];
    };
    OffendingLine.prototype.getColumnsLength = function () {
      return this.columns.length;
    };

    /* Assembler object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types.
    *
    *  Interface Assembler {
    *    assemble ( base, [part,] );
    *    getLength ();
    *    getElement ( index );
    *  }
    */
    var OffensesCollectionAssembler = (function () {

      var offending_files_collection = null;

      /* Assembles the collection of offending files by combining, as parts,
      *  the file, offending line and offending columns into a comprehensive
      *  object that is then inserted into the base collection.
      *  @param files: the files from the given paths to be evaluated for
      *                offenses
      *  @param finder: the finder object that gives the collection of
      *                 offending columns.
      */
      function assembleOffensesCollection ( files, finder ) {
        var offending_files_collection = files.map(function ( file ) {
          var lines = file.data.split(linefeed),
          offending_columns;
          var offending_file = new OffendingFile(file.path);
          for(var j in lines){
            if(lines[j].length > 0) {
              offending_columns =
                finder.find(lines[j]);
              if(offending_columns.length > 0) {
                offending_file.addOffendingLine(
                                        new OffendingLine(lines[j].trim(),
                                                          (+j) + 1,
                                                          offending_columns));
              } } }
          return offending_file;
        });
        return offending_files_collection;
      }

    return {
      assemble: function ( base, part ) {
        offending_files_collection = assembleOffensesCollection(base, part);
        return true;
      },
      getLength: function () {
        return offending_files_collection.length;
      },
      getElement: function ( index ) {
        return offending_files_collection[index];
      }
    };

    })();

    /*Various Parser objects for parsing the offenses for the output.*/
    var PlainTextFileParser = (function () {

      function parseHeader ( filepath ) {
        var check_file_text = linefeed +
                '[Checking for offenses in file: ' + filepath + ']';
        return linefeed + check_file_text + linefeed;
      }

      function parseStartLine () {
        return hr;
      }

      function parseLocation ( line_num, column_num, column_type ) {
        var arrow_text = '-> ',
            location_text = 'L' + line_num + ' C' + column_num;
        return arrow_text + column_type +
                ' attribute located at: ' + location_text + '.' + linefeed;
      }

      function parseFileLine ( line ) {
        return 'Offending line: ' + line + linefeed;
      }

      function parseEndLine () {
        return hr;
      }
      function parseEnd ( total ) {
        return 'Number of Offenses: ' + total + block_space;
      }

      function parseClean () {
        return hr + 'No offenses detected!' + linefeed + hr;
      }

      return {
        parseHeader: function ( filepath ) {
          return parseHeader ( filepath );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( line_num, column_num, column_type ) {
          return parseLocation ( line_num, column_num, column_type );
        },
        parseFileLine: function ( line ) {
          return parseFileLine ( line );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( total ) {
          return parseEnd ( total );
        },
        parseClean: function () {
          return parseClean ();
        }
      };
    })();

    var PlainTextOutputParser = (function () {

      function parseHeader ( filepath ) {
        var check_file_text = linefeed +
                ('[Checking for offenses in file: ' + filepath +
                 ']').magenta.bold;
        return linefeed + check_file_text + linefeed;
      }

      function parseStartLine () {
        return hr;
      }

      function parseLocation ( line_num, column_num, column_type ) {
        var arrow_text = ('-> ').yellow.bold,
            location_text = ('L' + line_num + ' C' + column_num).bold.white;
        return arrow_text + column_type +
                ' attribute located at: ' + location_text + '.' + linefeed;
      }

      function parseFileLine ( line ) {
        return ('Offending line: ').red.bold  + line + linefeed;
      }

      function parseEndLine () {
        return  hr;
      }

      function parseEnd ( total ) {
        return 'Number of Offenses: ' + total + block_space;
      }

      function parseClean () {
        return hr + 'No offenses detected!'.green.inverse + linefeed + hr;
      }

      return {
        parseHeader: function ( filepath ) {
          return parseHeader ( filepath );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( line_num, column_num, column_type ) {
          return parseLocation ( line_num, column_num, column_type );
        },
        parseFileLine: function ( line ) {
          return parseFileLine ( line );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( total ) {
          return parseEnd ( total );
        },
        parseClean: function () {
          return parseClean ();
        }
      };
    })();

    var MinimalXMLParser = (function () {

      function indentBy ( amount ) {
        var indent = '',
            it = 0;
        while (it < amount) {
          indent = indent + ' ';
          it++;
        }
        return indent;
      }

      function parseHeader ( filepath ) {
        var start_file_tag = '<file>' + linefeed,
            filepath_tag = indentBy(1) + '<filepath>' + filepath +
                            '</filepath>' + linefeed,
            start_body_tag = indentBy(1) + '<body>' + linefeed;
        return start_file_tag + filepath_tag + start_body_tag;
      }

      function parseStartLine () {
        var start_line_tag = indentBy(2) + '<line>' + linefeed;
        return start_line_tag;
      }

      function parseLocation ( line_num, column_num, column_type ) {
        var type_tag = indentBy(4) + '<type>' + column_type + '</type>' +
                        linefeed,
            row_tag = indentBy(4) + '<row>' + line_num + '</row>' + linefeed,
            col_tag = indentBy(4) + '<col>' + column_num + '</col>' + linefeed,
            offense_tag = indentBy(3) + '<offense>' + linefeed + type_tag +
                          row_tag + col_tag + indentBy(3) + '</offense>' +
                          linefeed;
        return offense_tag;
      }

      function parseFileLine ( line ) {
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
            total_offenses_tag = indentBy(1) + '<totalOffenses>' + total +
                              '</totalOffenses>' + linefeed,
            start_file_tag = '</file>' + linefeed;

        return end_body_tag + total_offenses_tag + start_file_tag;
      }

      function parseClean () {
        var message_tag = indentBy(3) + '<msg>No offenses found!</msg>'+
                          linefeed;
        return message_tag;
      }

      return {
        parseHeader: function ( filepath ) {
          return parseHeader ( filepath );
        },
        parseStartLine: function () {
          return parseStartLine ();
        },
        parseLocation: function ( line_num, column_num, column_type ) {
          return parseLocation ( line_num, column_num, column_type );
        },
        parseFileLine: function ( line ) {
          return parseFileLine ( line );
        },
        parseEndLine: function () {
          return parseEndLine ();
        },
        parseEnd: function ( total ) {
          return parseEnd ( total );
        },
        parseClean: function () {
          return parseClean ();
        }
      };
    })();

    /* Parses offenses
    */
    var OffendingFilesReader = (function () {

      var parsed_files = null;

      function readEachColumn ( offending_line, line_num, parser ) {
        var offending_column,
            column_number,
            column_type,
            output = '',
            it = 0;
        while (it < offending_line.getColumnsLength()) {
          offending_column = offending_line.getColumn(it);
          column_number = offending_column.getColumnNumber();
          column_type = offending_column.getColumnType();
          output = output + parser.parseLocation(line_num,
                                                 column_number,
                                                 column_type);
          it++;
        }
        return output;
      }

      function readEachLine ( offending_file, parser ) {
        var offending_line,
            line,
            line_num,
            output = '',
            it = 0;
        while (it < offending_file.getOffendingLinesLength()) {
          offending_line = offending_file.getOffendingLine(it);
          line = offending_line.getLine();
          line_num = offending_line.getLineNumber();
          output = output + parser.parseStartLine() +
                    readEachColumn(offending_line,
                                    line_num,
                                    parser);
          output = output + parser.parseFileLine(line) + parser.parseEndLine();
          it++;
        }
        
        return output;
      }

      function readEachFile ( assembler, parser ) {
        var offending_file,
            output,
            filepath,
            outputs = [],
            it = 0;
        while(it < assembler.getLength()) {
          offending_file = assembler.getElement(it);
          filepath = offending_file.getFilePath();
          output = parser.parseHeader(filepath);
          if(offending_file.getOffendingLinesLength() === 0) {
            output = output + parser.parseClean() + parser.parseEnd();
          } else {
            output = output + readEachLine( offending_file, parser ) +
                      parser.parseEnd(offending_file.getTotalOffenses());
          }
          outputs.push(output);
          it++;
        }
        return outputs;
      }

      return {
        read: function ( assembler, parser ) {
          parsed_files = readEachFile( assembler, parser );
          return true;
        },
        getParsedFile: function ( file_index ) {
          return parsed_files[file_index];
        },
        getParsedFilesLength: function () {
          if (parsed_files !== null) { return parsed_files.length; }
          else { return -1; }
        }
      };
    })();

    /*Takes the parsed results array that represents each input file and outputs them either to standard output or to a specified output file from the options.*/
    var Reporter = (function () {

      function outputOffenses ( dest, parser, toFile ) {
        var output_file = '',
            parsed_file,
            it = 0;
        while (it < parser.getParsedFilesLength()) {
          parsed_file = parser.getParsedFile(it);
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
        outputOffenses: function ( dest, parser, toFile ) {
          outputOffenses (dest, parser, toFile);
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
        }).map( function ( filepath ) {
          return {path: filepath, data: grunt.file.read(filepath)};
        });
        if(files.length > 0){
          if(options.reporter.to_file === undefined){
            options.reporter.to_file = true;
          }
          if(options.reporter.tag === (undefined || 'default')) {
            OffendingColumnFinder.changeTabWidth(4);
            OffensesCollectionAssembler.assemble(files, OffendingColumnFinder);
            OffendingFilesReader.read(OffensesCollectionAssembler,
                                      MinimalXMLParser);
            Reporter.outputOffenses(file_block, OffendingFilesReader);
            if(options.reporter.to_file === true &&
               options.reporter.to_file.length === undefined) {
              OffendingFilesReader.read(OffensesCollectionAssembler,
                                        MinimalXMLParser);
              Reporter.outputOffenses(file_block, OffendingFilesReader, true);
            }
          } else {
            Reporter.customOutputOffenses (function() {grunt.log.writeln('hi');});
          }
        }
      });
  });

};