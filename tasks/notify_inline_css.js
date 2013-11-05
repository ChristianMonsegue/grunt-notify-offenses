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

    /*Given a list of input files, it takes each file and finds all the metadata about the offenses. The search criteria can be extended to look for more than css style offenses (ex: SQL queries, inline javascript, etc). This will be used later on by the parser which interprets this data.
      Parsed Metadata:
        -path of file
        -offending line
        -offending line number
        -offending columns of the line
    */
    var Finder = (function () {

      function findOffendingCSSColumns ( line ) {
        var style_pattern = /style\s*=\s*(\"|\')[\s\ta-z0-9\-\:\;{}\(\)\+\=\&\%\#\@\!\$_\"\']*(\"|\')>/gi, result, columns = [];
        while ( (result = style_pattern.exec(line)) ) {
            columns.push(result.index + 1);
        }
        return columns;
      }
      function getMetaFile ( file_num ) {
        return metadata[file_num];
      }

      function findOffenses ( files ) {
        var files_metadata = files.map(function ( file ) {
          var lines = file.data.split(linefeed),
          offending_columns;
          var current_file = {path: file.path, offenses: []};
          for(var j = 0; j < lines.length; j++){
            if(lines[j].length > 0){
              offending_columns = findOffendingCSSColumns(lines[j]);
              if(offending_columns.length > 0){
                current_file.offenses.push({line: lines[j], line_num: j + 1, columns: offending_columns});
              } } }
          return current_file;
        });
        return files_metadata;
      }

      var metadata = null;

    return {
      defaultfindOffenses: function ( src ){
        metadata = findOffenses (src);
        return true;
      },
      getNumberOfFiles: function () {
        return metadata.length;
      },
      
      getNumberOfOffenses: function ( file_num ) {
        return getMetaFile(file_num).offenses.length;
      },
      getFilePath: function ( file_num ) {
        return getMetaFile(file_num).path;
      },
      getFileLine: function ( file_num, offense ) {
        return getMetaFile(file_num).offenses[offense].line;
      },
      getFileLineNumber: function ( file_num, offense ) {
        return getMetaFile(file_num).offenses[offense].line_num;
      },
      getFileColumns: function ( file_num, offense ) {
        return getMetaFile(file_num).offenses[offense].columns;
      }
    };

    })();

    /*Takes the metadata object that contains data about the offenses in the file(s) and parses it into a readable output of a specific format.*/
    var Parser = (function () {
      var hr = '______________________________________________________\n';

      function parseFileOffenses ( finder, file, toFile ) {
        var offenses_length = finder.getNumberOfOffenses(file), 
            line,
            line_num,
            columns,
            output = '';
        for (var j = 0; j < offenses_length; j++) {
          line = finder.getFileLine(file, j);
          line_num = finder.getFileLineNumber(file, j);
          columns = finder.getFileColumns(file, j);
          for(var i = 0; i < columns.length; i++){
            output = toFile ?
            output + '-> ' + 'Style attribute located at: ' + 'L' +
            line_num + ' C' + columns[i] + '.' + linefeed :
            output + ('-> ').yellow.bold + 'Style attribute located at: ' +
            ('L' + line_num + ' C' + columns[i]).bold.white + '.' + linefeed;
          }
          output = toFile ?
          output + hr + 'Offending line: ' + line + block_space :
          output+ hr + ('Offending line: ').red.bold  + line + block_space;
        }
        return output;
      }

      function parseAllOffenses ( finder, toFile ) {
        var metadata_length = finder.getNumberOfFiles(),
            outputs = [];
        for (var i = 0; i < metadata_length; i++) {
          var output = toFile ?
          linefeed + '[Checking for inline css styles in file: ' + finder.getFilePath(i) + ']' + block_space :
          linefeed + ('[Checking for inline css styles in file: ' + finder.getFilePath(i) + ']').magenta.bold + block_space;
          if(finder.getNumberOfOffenses(i) === 0){
            output = toFile ?
            output + "No offenses detected!" + block_space :
            output + "No offenses detected!".green.inverse + block_space;
          }else{
            output = output + parseFileOffenses( finder, i, toFile );
          }
          outputs.push(output);
        }
        return outputs;
      }

      var parsed_files = null;

      return {
        defaultParseOffenses: function ( finder, toFile ) {
          parsed_files = parseAllOffenses ( finder, toFile );
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
            parsed_files_length = parser.getParsedFilesLength();
        for(var i = 0; i < parsed_files_length; i++) {
          parsed_file = parser.getParsedFile(i);
          if(toFile){ output_file = output_file + parsed_file;
          } else { 
            grunt.log.write(parsed_file); 
          } }
        if(toFile) {
          grunt.file.write(dest.dest, output_file);
          grunt.log.writeln(('File "' + dest.dest + '" created.').white.bold);
        }
      }

      return {
        customOutputOffenses: function ( customOutput ) {
          customOutput();
        },
        defaultOutputOffenses: function ( dest, parser, toFile ) {
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
            Finder.defaultfindOffenses(files);
            Parser.defaultParseOffenses(Finder);
            Reporter.defaultOutputOffenses(file_block, Parser);
            /*if(options.reporter.to_file === true && options.reporter.to_file.length === undefined) {
              var file_print = Parser.defaultParseOffenses(Finder, true);
              Reporter.defaultOutputOffenses (file_block, file_print, true);
            }*/
          } else {
            Reporter.customOutputOffenses (function() {grunt.log.writeln('hi');});
          }
        }
      });
  });

};