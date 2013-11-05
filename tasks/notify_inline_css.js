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

  grunt.registerMultiTask('notify_inline_css', 'Searches through a list of files and notifies on all declarative inline code.', function() {

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
    Column.prototype.getColumnType = function() {
      return this.type;
    };
    Column.prototype.getColumnNumber = function() {
      return this.column;
    };

    var Strategies = (function () {

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
    MetaDataFile.prototype.getOffensesLength = function() {
      return this.offenses.length;
    };
    MetaDataFile.prototype.getOffense = function( index ) {
      return this.offenses[index];
    };
    MetaDataFile.prototype.addOffense = function( offense ) {
      return this.offenses.push(offense);
    };

    /*Class denoting each Offense found in a file.
    */
    function Offense ( line, line_num, columns ) {
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
    Offense.prototype.getColumn = function( index ) {
      return this.columns[index];
    };
    Offense.prototype.getColumnsLength = function( ) {
      return this.columns.length;
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
          var current_file = new MetaDataFile(file.path);
          for(var j in lines){
            if(lines[j].length > 0){
              offending_columns =
                strategies.offendingColumnsForAllPatterns(lines[j]);
              if(offending_columns.length > 0){
                current_file.addOffense(new Offense(lines[j].trim(),
                                                    (+j) + 1,
                                                    offending_columns));
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
      getMetaDataLength: function () {
        return metadata.length;
      },
      getMetaDataFile: function ( index ) {
        return metadata[index];
      }
    };

    })();

    /*Takes the metadata object that contains data about the offenses in the file(s) and parses it into a readable output of a specific format.*/
    var Parser = (function () {
      var hr = '______________________________________________________\n';

      var parsed_files = null;

      function parseLocationToPlainText ( offense, line_num, toFile ) {
        var arrow_text,
            location_text,
            column,
            output = '',
            it = 0;
        while (it < offense.getColumnsLength()){
          column = offense.getColumn(it);
            arrow_text = toFile ? '-> ' : ('-> ').yellow.bold;
            location_text = toFile ?
                            'L' + line_num + ' C' + column.getColumnNumber() :
                            ('L' + line_num + ' C' + column.getColumnNumber()).bold.white;
            output = output + arrow_text + column.getColumnType() + ' attribute located at: ' + location_text + '.' + linefeed;
          it++;
        }
        return output;
      }

      function parseFileToPlainText ( finder, metadata_file, toFile ) {
        var offense,
            line,
            line_num,
            output = '',
            it = 0;
        while (it < metadata_file.getOffensesLength()) {
          offense = metadata_file.getOffense(it);
          line = offense.getLine();
          line_num = offense.getLineNumber();
          output = output + parseLocationToPlainText(offense,line_num, toFile);
          output = toFile ?
                    output + hr + 'Offending line: ' + line + block_space :
                    output+ hr + ('Offending line: ').red.bold  + line +
                    block_space;
          it++;
        }
        return output;
      }

      function parseAllToPlainText ( finder, toFile ) {
        var metadata_file,
            output,
            check_file_text,
            outputs = [],
            it = 0;
        while(it < finder.getMetaDataLength()) {
          metadata_file = finder.getMetaDataFile(it);
          check_file_text = toFile ?
                            '[Checking for offenses in file: ' +
                            metadata_file.getFilePath() + ']' :
                            ('[Checking for offenses in file: ' +
                             metadata_file.getFilePath() + ']').magenta.bold;
          output = linefeed + check_file_text + block_space;
          if(metadata_file.getOffensesLength() === 0){
            output = toFile ?
                    output + "No offenses detected!" + block_space :
                    output + "No offenses detected!".green.inverse +
                    block_space;
          }else{
            output = output + parseFileToPlainText( finder, metadata_file, toFile );
          }
          outputs.push(output);
          it++;
        }
        return outputs;
      }

      return {
        parseOffensesToPlainText: function ( finder, toFile ) {
          parsed_files = parseAllToPlainText( finder, toFile );
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