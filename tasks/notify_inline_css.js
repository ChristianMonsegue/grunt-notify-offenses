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
      punctuation: '.',
      separator: ', '
    });

    function findOffenses ( src ) {
      var lines = src.split(linefeed),
      out = '',
      column = 0,
      column_offset = 0,
      offending_css = '',
      formatted_line = '',
      is_offending = false,
      hr = '_______________________________________' + linefeed;

      for(var i = 0; i < lines.length; i++){
        offending_css = ''; column = 0; column_offset = 0;
        if(lines[i].length > 0){
          var sliced_line = lines[i].slice(column);
          while (offending_css !== null) {
            offending_css = sliced_line.match(/<[\S\s]*style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
            column = sliced_line.search(/<[\S\s]*style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
            if(offending_css !== null) {
              //is_offending = true;
              out = out + ("->").yellow.bold + "Style attribute located at: " + ("L" + (i + 1)).bold.white + (" C" + (column + column_offset + 1)).bold.white + "." + linefeed;
            }
            sliced_line = lines[i].slice(column + column_offset + 1);
            column_offset = column_offset + column + 1;
          }
        }
        if(column_offset > 0) { out = out + hr + ("Offending line: ").green.bold  + lines[i] + linefeed + linefeed; }
      }
      return out;
    }

    function outputLog ( src, dest, data ) {
      var output_file = '';
      grunt.log.write(linefeed);
      for(var k = 0; k < data.length; k++) {
        var header = "Checking for inline css style in file: " + src[k] + linefeed;
        output_file = output_file + header + data[k] + linefeed;
        header = header.red.bold;
        grunt.log.write(header + data[k] + linefeed);
      }
      grunt.file.write(dest.dest, output_file);
      var creation_notify = 'File "' + dest.dest + '" created.';
      grunt.log.writeln(creation_notify.white.bold);
    }

    this.files.forEach( function ( f ) {
      var paths = [];
      var src = f.src.filter( function ( filepath ) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        }).map( function ( filepath ) {
          paths.push(filepath);
          return grunt.file.read(filepath);
        });
        var all_out = [];
        for(var j = 0; j < src.length; j++){
          all_out.push(findOffenses(src[j]));
          /*var lines = src[j].split(linefeed),
          out = '',
          column = 0,
          column_offset = 0,
          offending_css = '',
          formatted_line = '',
          is_offending = false,
          hr = '_______________________________________' + linefeed;

          for(var i = 0; i < lines.length; i++){
            offending_css = ''; column = 0; column_offset = 0;
            if(lines[i].length > 0){
              var sliced_line = lines[i].slice(column);
              while (offending_css !== null) {
                offending_css = sliced_line.match(/<[\S\s]*style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
                column = sliced_line.search(/<[\S\s]*style\s*=\s*(\"|\')[\S\s]*(\"|\')[\S\s]*>?[\S\s]*<?[\s\S]*>/i);
                if(offending_css !== null) {
                  //is_offending = true;
                  out = out + ("->").yellow.bold + "Style attribute located at: " + ("L" + (i + 1)).bold.white + (" C" + (column + column_offset + 1)).bold.white + "." + linefeed;
                }
                sliced_line = lines[i].slice(column + column_offset + 1);
                column_offset = column_offset + column + 1;
              }

            }
            
            if(column_offset > 0) { out = out + hr + ("Offending line: ").green.bold  + lines[i] + linefeed + linefeed; }
          }
          all_out.push(out);*/
        }
        outputLog (paths, f, all_out);
      });
  });

};