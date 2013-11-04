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
    var linefeed = grunt.util.linefeed;
    var block_space = linefeed + linefeed + linefeed;

    var InlineCSSOffense = (function () {
      var hr = '______________________________________________________\n';

      function findOffendingColumns (str) {
        var regex=/style\s*=\s*(\"|\')[\sa-z0-9\-\:\;{}\(\)\+\=\&\%\#\@\!\$_]*(\"|\')>/gi, result, indices = [];
        while ( (result = regex.exec(str)) ) {
            indices.push(result.index);
        }
        return indices;
      }

      function logOffenses (offense, line, columns, out, isFile) {
        var output = out;
        for (var i = 0; i < columns.length; i++) {
          output = isFile ?
          output + '-> ' + 'Style attribute located at: ' + 'L' + (line + 1) + ' C' + (columns[i] + 1) + '.' + linefeed :
          output + ('-> ').yellow.bold + 'Style attribute located at: ' + ('L' + (line + 1)).bold.white + (' C' + (columns[i] + 1)).bold.white + '.' + linefeed;
        }
        output = isFile ?
        output + hr + 'Offending line: ' + offense + block_space :
        output + hr + ('Offending line: ').green.bold  + offense + block_space;

        return output;
      }

      function findOffenses ( src ) {
        var multiple_outputs = { file_out: [], stout_out: [] };
        for(var i = 0; i < src.length; i++) {
          var lines = src[i].split(linefeed),
          offending_columns,
          file_out = '',
          stout_out = '';

          for(var j = 0; j < lines.length; j++){
            if(lines[j].length > 0){
              offending_columns = findOffendingColumns(lines[j]);
              if(offending_columns.length > 0){
                stout_out = logOffenses(lines[j], j, offending_columns, stout_out, false);
                file_out = logOffenses(lines[j], j, offending_columns, file_out, true);
              }
            }
          }
          multiple_outputs.file_out.push(file_out);
          multiple_outputs.stout_out.push(stout_out);
        }
        return multiple_outputs;
      }

    return {
      customFindOffenses: function ( input ) {
        return input;
      },
      defaultFindOffenses: function ( src ) {
        return findOffenses (src);
      }
    };

    })();

    var Reporter = (function () {
      var hr = '______________________________________________________\n';

      function logOffenses (offense, line, columns, out, isFile) {
        var output = out;
        for (var i = 0; i < columns.length; i++) {
          output = isFile ?
          output + '-> ' + 'Style attribute located at: ' + 'L' + (line + 1) + ' C' + (columns[i] + 1) + '.' + linefeed :
          output + ('-> ').yellow.bold + 'Style attribute located at: ' + ('L' + (line + 1)).bold.white + (' C' + (columns[i] + 1)).bold.white + '.' + linefeed;
        }
        output = isFile ?
        output + hr + 'Offending line: ' + offense + block_space :
        output + hr + ('Offending line: ').green.bold  + offense + block_space;

        return output;
      }

      function outputLog ( src, dest, to_stout_data, to_file_data ) {
        var output_file = '';

        for(var i = 0; i < src.length; i++) {
          var header = '[Checking for inline css styles in file: ' + src[i] + ']' + block_space;
          if(to_file_data !== undefined) {
            output_file = output_file + header + to_file_data[i] + linefeed;
          }
          header = header.red.bold;
          if(to_stout_data !== undefined) {
            grunt.log.write(header + to_stout_data[i] + linefeed);
          }
        }
        if(to_file_data !== undefined) {
          grunt.file.write(dest.dest, output_file);
          grunt.log.writeln(('File "' + dest.dest + '" created.').white.bold);
        }
      }

      return {
        customOutputLog: function ( output ) {
          return output;
        },
        defaultOutputLog: function (src, dest, to_stout_data, to_file_data) {
          outputLog (src, dest, to_stout_data, to_file_data);
        }
      };
    })();
    

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      reporter: {
        tag: 'default',
        file_output: true,
        st_out: true
      }
    });

    this.files.forEach( function ( f ) {
      var paths = [];
      var src = f.src.filter( function ( filepath ) {
          if (!grunt.file.isFile(filepath)) {
            grunt.log.write('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        }).map( function ( filepath ) {
          paths.push(filepath);
          return grunt.file.read(filepath);
        });
        if(options.reporter.st_out === undefined){
          options.reporter.st_out = true;
        }
        if(options.reporter.file_out === undefined){
          options.reporter.file_out = true;
        }
        if(options.reporter.tag === (undefined || 'default')) {
          var mult_out = InlineCSSOffense.defaultFindOffenses(src);
          Reporter.defaultOutputLog (paths, f,
                     options.reporter.st_out === true && options.reporter.st_out.length === undefined ? mult_out.stout_out : undefined,
                     options.reporter.file_out === true && options.reporter.file_out.length === undefined ? mult_out.file_out : undefined);
        } else {
          Reporter.customOutputLog (function() {grunt.log.writeln('hi');});
        }
      });
  });

};