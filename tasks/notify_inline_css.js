/*
 * grunt-notify-inline-css
 * https://github.com/christian.monsegue/gruntplugins
 *
 * Copyright (c) 2013 Christian Monsegue
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('notify_inline_css', 'Searches through a list of files and notifies on all declarative inline css.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });

    this.files.forEach(function (f) {
      var paths = [];
      var linefeed = grunt.util.linefeed;
      //grunt.log.writeln('passed initial');
      var src = f.src.filter(function (filepath) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        }).map(function (filepath) {
          paths.push(filepath);
          return grunt.file.read(filepath);
        });
        //grunt.log.writeln("Got files: " + src + linefeed + paths);
        var all_out = [];
        for(var j = 0; j < src.length; j++){
          var lines = src[j].split(linefeed);
          //grunt.log.writeln("Got file" + j + ": " + lines);
          var out = '', column = 0, tag = '';
          for(var i = 0; i < lines.length; i++){
            tag = '';
            if(lines[i].length > 0){
              tag = lines[i].match(/style\s*=\s*(\"|\')[\S\s]*(\"|\')/);
              //grunt.log.writeln(tag);
              column = lines[i].search(/style\s*=\s*(\"|\')[\S\s]*(\"|\')/);
              if(tag) {
                var formatted_line = lines[i].replace(/\t|(\s*<)/, '');
                out = out + "Style attribute located at: L" + (i+1) + " C" + (column+1) + "." + linefeed + " Offending line: <" + formatted_line + linefeed + linefeed;
              }
            }
          }
          all_out.push(out);
          //grunt.log.writeln("Got results: " + all_out);
        }
        var output_file = '';
        grunt.log.write(linefeed);
        for(var k = 0; k < all_out.length; k++) {
          var head = "Checking for inline css in file: " + paths[k] + linefeed;
          grunt.log.write(head + all_out[k] + linefeed);
          output_file = output_file + head + all_out[k] + linefeed;
        }
        grunt.file.write(f.dest, output_file);
        grunt.log.writeln('File "' + f.dest + '" created.');
      });
  });

};
