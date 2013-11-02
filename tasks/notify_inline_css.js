/*
 * grunt-notify-inline-css
 * https://github.com/christian.monsegue/gruntplugins
 *
 * Copyright (c) 2013 Christian Monsegue
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function( grunt ) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('notify_inline_css', 'Searches through a list of files and notifies on all declarative inline css.', function() {
    var linefeed = grunt.util.linefeed;
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      reporter: {
        tag: 'default',
        file_output: true,
        st_out: true
      }
    });

    function defaultFindOffenses ( src ) {
      var multiple_outputs = { file_out: [], stout_out: [] };
      for(var i = 0; i < src.length; i++) {
        var lines = src[i].split(linefeed),
        file_out = "",
        stout_out = "",
        column,
        column_offset,
        offending_css,
        formatted_line,
        hr = '_______________________________________' + linefeed;

        for(var j = 0; j < lines.length; j++){
          offending_css = ""; column = 0; column_offset = 0;
          if(lines[j].length > 0){
            var sliced_line = lines[j].slice(column);
            while (offending_css !== null) {
              offending_css = sliced_line.match(/style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
              column = sliced_line.search(/style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
              if(offending_css !== null) {
                stout_out = stout_out + ("->").yellow.bold + "Style attribute located at: " + ("L" + (j + 1)).bold.white + (" C" + (column + column_offset + 1)).bold.white + "." + linefeed;
                file_out = file_out + "->" + "Style attribute located at: " + "L" + (j + 1) + " C" + (column + column_offset + 1) + "." + linefeed;
              }
              sliced_line = lines[j].slice(column + column_offset + 1);
              column_offset = column_offset + column + 1;
            }
          }
          if(column_offset > 0) {
            stout_out = stout_out + hr + ("Offending line: ").green.bold  + lines[j] + linefeed + linefeed;
            file_out = file_out + hr + "Offending line: " + lines[j] + linefeed + linefeed;
          }
        }
        multiple_outputs.file_out.push(file_out);
        multiple_outputs.stout_out.push(stout_out);
    }
      return multiple_outputs;
    }

    function outputLog ( src, dest, to_stout_data, to_file_data ) {
      var output_file = '';
      //grunt.log.write(linefeed + " " + to_file_data + " " + src.length);

      for(var i = 0; i < src.length; i++) {
        var header = "[Checking for inline css style in file: " + src[i] + "]" + linefeed;
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
        grunt.log.writeln(options.reporter.st_out.length);
        if(options.reporter.tag === (undefined || 'default')){
          var mult_out = defaultFindOffenses(src);
          outputLog (paths, f,
                     options.reporter.st_out === true && options.reporter.st_out.length === undefined ? mult_out.stout_out : undefined,
                     options.reporter.file_out === true && options.reporter.file_out.length === undefined ? mult_out.file_out : undefined);
        } else {
          grunt.log.write('No reporters yet');
        }
      });
  });

};