/*
 * grunt-notify-offenses
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
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    //Default configuration with save set to true to write output to file.
    notify_offenses: {
      default_with_save_options: {
        options: {
          save: true
        },
        files: {
          'tmp/no-inline-html': ['test/fixtures/no-inline-1.html'],
          'tmp/basic-inline-html': ['test/fixtures/basic-inline-1.html'],
          'tmp/basic-js-console-log': ['test/fixtures/basic-console-log-1.js'],
          'tmp/basic-inline-cbd': ['test/fixtures/basic-inline-1.cbd']
        }
      },
      /*Searches a user defined offense with global and case-insensitive flags and writes the output to a XML file.*/
      user_offense_to_xml: {
        options: {
          save: true,
          output: 'minimalxml',
          offenses : {
            "erroneous": {
              message: 'Erroneous attribute detected. Please remove.',
              pattern: ['erroneous[\\s\\t]*=[\\s\\t]*(\"|\')[\\s\\ta-z0-9\\-\\:\\;{}\\/\\(\\)\\+\\=\\&\\%\\#\\@\\!\\,\\$_\"\']*(\"|\')', 'global', 'i'],
              extensions: ['html']
            }
          }
        },
        files: {
          'tmp/user-xml-no-inline-html': ['test/fixtures/no-inline-1.html'],
          'tmp/user-xml-inline-html': ['test/fixtures/user-inline-1.html'],
          'tmp/user-xml-js-console-log': ['test/fixtures/basic-console-log-1.js'],
          'tmp/user-xml-inline-cfm': ['test/fixtures/user-inline-1.cfm']
        }
      },
      /*user - u, clean - c - all. override - o - true
      Searches a user defined offense with global and case-insensitive flags. Override is set to true, clean all lines of the outputs of all spaces and writes the output to a JSON file.*/
      uco_to_json: {
        options: {
          save: true,
          override: true,
          cleaner: 'all',
          output: 'json',
          offenses : {
            "style": {
              pattern: ['erroneous', 'i', 'g'],
              extensions: ['html', 'cbd']
            },
            "erroneous": {
              message: 'Erroneous attribute detected. Please remove.',
              pattern: ['erroneous[\\s\\t]*=[\\s\\t]*(\"|\')[\\s\\ta-z0-9\\-\\:\\;{}\\/\\(\\)\\+\\=\\&\\%\\#\\@\\!\\,\\$_\"\']*(\"|\')', 'g', 'i'],
              extensions: ['html']
            }
          }
        },
        files: {
          'tmp/uco-json-no-inline-html': ['test/fixtures/no-inline-1.html'],
          'tmp/uco-json-inline-html': ['test/fixtures/user-inline-1.html'],
          'tmp/uco-json-js-console-log': ['test/fixtures/basic-console-log-1.js'],
          'tmp/uco-json-inline-cbd': ['test/fixtures/user-inline-1.cbd']
        }
      }
    },


    //Unit Tests
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'notify_offenses', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
