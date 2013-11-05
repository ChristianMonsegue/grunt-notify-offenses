/*
 * grunt-notify-inline-css
 * https://github.com/christian.monsegue/gruntplugins
 *
 * Copyright (c) 2013 Christian Monsegue
 * Licensed under the MIT license.
 */



module.exports = function( grunt ) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('notify_inline_css', 'Searches through a list of files and notifies on all declarative inline css.', function() {

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      reporter: {
        tag: 'default',
        to_file: true,
      }
    });

    var linefeed = grunt.util.linefeed;
    var block_space = linefeed + linefeed + linefeed;

    function Column (type, column) {
      this.type = type;
      this.column = column;
    }
    Column.prototype.getType = function() {
      return this.type;
    };
    Column.prototype.getColumn = function() {
      return this.column;
    };

    var Strategies = (function () {

      var patterns =
      [
        {
          type: 'CSS',
          pattern: /style\s*=\s*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\$_\"\']*(\"|\')/gi
        },
        {
          type: 'Align',
          pattern: /align\s*=\s*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\$_\"\']*(\"|\')/gi
        }
      ];

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

      function findColumns( line, type, pattern ) {
          var style_pattern,
              result,
              columns = [];
          if(pattern === undefined) {
            if(doesTypeExist(type)){
              style_pattern = getPattern(type);
            } else {
              return [];
            }
          } else {
            style_pattern = pattern;
          }
          while ( (result = style_pattern.exec(line)) ) {
                columns.push(new Column(type, result.index + 1));
          }
          return columns;
        }

      return {
        findOffendingColumns: function ( line, type, pattern ) {
          return findColumns (line, type, pattern );
        },
        offendingColumnsForAllPatterns: function ( line ) {
          var columns = [], other_columns;
          for (var i in patterns) {
            columns = columns.concat(findColumns (line,
                                                  patterns[i].type,
                                                  patterns[i].pattern));
          }
          return columns;
        }
      };

    })();

    /*Given a list of input files, it takes each file and finds all the metadata about the offenses. The search criteria can be expanded and manipulated using the Strategies object. This will be used later on by the parser which interprets this data.
      Parsed Metadata:
        -path of file
        -offending line
        -offending line number
        -offense type
        -offending columns of the line given that type
    */
    function MetaDataFile (path) {
      this.path = path;
      this.offenses = [];
    }
    MetaDataFile.prototype.getFilePath = function() {
      return this.path;
    };
    MetaDataFile.prototype.getFileOffenses = function() {
      return this.offenses;
    };
     MetaDataFile.prototype.getFileOffense = function(index) {
      return this.offenses[index];
    };

    function Offense (line, line_num, columns) {
      this.line = line;
      this.line_num = line_num;
      this.columns = columns;
    }
    Offense.prototype.getLine = function() {
      return this.line;
    };
    Offense.prototype.getLineNumber = function() {
      return this.line_num;
    };
    Offense.prototype.getColumns = function() {
      return this.columns;
    };


    var Finder = (function () {

      var metadata = null;

      function getMetaFile ( file_num ) {
        return metadata[file_num];
      }

      function findOffenses ( files, strategies ) {
        var files_metadata = files.map(function ( file ) {
          var lines = file.data.split(linefeed),
          offending_columns;
          var current_file = {path: file.path, offenses: []};
          for(var j in lines){
            if(lines[j].length > 0){
              offending_columns =
                strategies.offendingColumnsForAllPatterns(lines[j]);
              if(offending_columns.length > 0){
                current_file.offenses.push({line: lines[j],
                                            line_num: (+j) + 1,
                                            columns: offending_columns});
              } } }
          return current_file;
        });
        return files_metadata;
      }

    return {
      findOffenses: function ( src, strategies ){
        metadata = findOffenses (src, strategies);
        return true;
      },
      getListOfFiles: function () {
        return metadata;
      },
      getNumberOfFiles: function () {
        return metadata.length;
      },
      getOffenses: function ( file_num ) {
        return getMetaFile(file_num).offenses;
      },
      getNumberOfOffenses: function ( file_num ) {
        return getMetaFile(file_num).offenses.length;
      },
      getFilePath: function ( file_num ) {
        return getMetaFile(file_num).path;
      },
      getFileLine: function ( offenses, index ) {
        return offenses[index].line;
      },
      getFileLineNumber: function ( offenses, index ) {
        return offenses[index].line_num;
      },
      getFileColumns: function ( offenses, index ) {
        return offenses[index].columns;
      }
    };

    })();

    /*Takes the metadata object that contains data about the offenses in the file(s) and parses it into a readable output of a specific format.*/
    var Parser = (function () {
      var hr = '______________________________________________________\n';

      var parsed_files = null;

      function parseFileInPlainText ( finder, file, toFile ) {
        var offenses = finder.getOffenses(file), 
            line,
            line_num,
            columns,
            arrow_text,
            location_text,
            output = '';
        for (var j in offenses) {
          line = finder.getFileLine(offenses, j);
          line_num = finder.getFileLineNumber(offenses, j);
          columns = finder.getFileColumns(offenses, j);
          for(var i = 0; i < columns.length; i++){
            arrow_text = toFile ? '-> ' : ('-> ').yellow.bold;
            location_text = toFile ?
                            'L' + line_num + ' C' + columns[i].getColumn() :
                            ('L' + line_num + ' C' +columns[i].getColumn()).bold.white;
            output = output + arrow_text + columns[i].getType() + ' attribute located at: ' + location_text + '.' + linefeed;
          }
          output = toFile ?
                    output + hr + 'Offending line: ' + line + block_space :
                    output+ hr + ('Offending line: ').red.bold  + line +
                    block_space;
        }
        return output;
      }

      function parseAllInPlainText ( finder, toFile ) {
        var metadata_length = finder.getNumberOfFiles(),
            output,
            check_file_text,
            outputs = [];
        for (var i = 0; i < metadata_length; i++) {
          check_file_text = toFile ?
                            '[Checking for offenses in file: ' +
                            finder.getFilePath(i) + ']' :
                            ('[Checking for offenses in file: ' +
                             finder.getFilePath(i) + ']').magenta.bold;
          output = linefeed + check_file_text + block_space;
          if(finder.getNumberOfOffenses(i) === 0){
            output = toFile ?
                    output + "No offenses detected!" + block_space :
                    output + "No offenses detected!".green.inverse +
                    block_space;
          }else{
            output = output + parseFileInPlainText( finder, i, toFile );
          }
          outputs.push(output);
        }
        return outputs;
      }

      return {
        parseOffensesToPlainText: function ( finder, toFile ) {
          parsed_files = parseAllInPlainText( finder, toFile );
          return true;
        },
        getParsedFiles: function () {
          //grunt.log.writeln(parsed_files[0]);
          return parsed_files;
        },
        getParsedFile: function ( file_index ) {
          return parsed_files[file_index];
        },
        getParsedFilesLength: function () {
          if (parsed_files !== null) { return parsed_files.length; }
          else { return -1; }
        },
        getParsedFileIndex: function ( file ) {
          return parsed_files.indexOf( file );
        }
      };
    })();

    /*Takes the parsed results array that represents each input file and outputs them either to standard output or to a specified output file from the options.*/
    var Reporter = (function () {

      function outputOffenses ( dest, parser, toFile ) {
        var output_file = '',
            parsed_file,
            iterator = 0;
        while (iterator < parser.getParsedFilesLength()) {
          parsed_file = parser.getParsedFile(iterator);
          if(toFile) {
            output_file = output_file + parsed_file;
          } else {
            grunt.log.write(parsed_file); 
          }
          iterator++; 
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
        }
      };

    })();

    this.files.forEach( function ( file_block ) {
      var files = file_block.src.filter( function ( filepath ) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.write('Source file "' + filepath + '" not found.');
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
            Finder.findOffenses(files, Strategies);
            Parser.parseOffensesToPlainText(Finder);
            Reporter.outputOffenses(file_block, Parser);
            if(options.reporter.to_file === true && options.reporter.to_file.length === undefined) {
              Parser.parseOffensesToPlainText(Finder, true);
              Reporter.outputOffenses(file_block, Parser, true);
            }
          } else {
            Reporter.customOutputOffenses (function() {grunt.log.writeln('hi');});
          }
        }
      });
  });

};