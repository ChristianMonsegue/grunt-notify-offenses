/*
 * grunt-notify-inline-offenses
 * https://github.com/christian.monsegue/gruntplugins
 *
 * Copyright (c) 2013 Christian Monsegue
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    notify_inline_offenses: {
      default_options: {
        options: {
          to_file: true,
          reporter: {
            stout: 'decoratedplaintext'
          },
          finder: {
            override: true,
            offenses : {
              "bloop": {
                          message: 'Erroneous attribute.',
                          pattern: ['bloop[\\s\\t]*=[\\s\\t]*(\"|\')[\\s\\ta-z0-9\\-\\:\\;{}\\/\\(\\)\\+\\=\\&\\%\\#\\@\\!\\,\\$_\"\']*(\"|\')', 'global', 'i']
                      }
            },
            force: true
          },
          assembler: {
            tabwidth: 4,
            trim_lines: 'trailing'
          }
        },
        files: {
          'tmp/inlinet': ['C:/Users/christian.monsegue/Documents/GruntPlugins/test/fixtures/inline1.html'],
          'tmp/remittence': ['C:/workspace/AM/EHR/HM/**/*.html']
        },
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['notify_inline_offenses']);

};
