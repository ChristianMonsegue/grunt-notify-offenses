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

    // Configuration to be run.
    notify_offenses: {
      default_options: {
        options: {
          save: false,
          override: false,
          force: true,
          tabwidth: 4,
          cleaner: 'trailing',
          stout: 'plaintext',
          output: 'plaintext'
        },
        files: {
          'tmp/inline-result': ['test/fixtures/inline1.html','test/fixtures/noInline1.html']
        },
      },
      //Configuration to be run (and then tested)
      test_options: {
        options: {
          save: true,
          stout: 'decoratedplaintext',
          output: 'minimalxml',
          offenses : {
            "erroneous": {
              message: 'Erroneous attribute detected. Please remove.',
              pattern: ['erroneous[\\s\\t]*=[\\s\\t]*(\"|\')[\\s\\ta-z0-9\\-\\:\\;{}\\/\\(\\)\\+\\=\\&\\%\\#\\@\\!\\,\\$_\"\']*(\"|\')', 'global', 'i']
            }
          },
          force: true
        },
        files: {
          'tmp/inline-result': ['test/fixtures/*.html','test/fixtures/*.js']
        },
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
  grunt.registerTask('test', ['clean', 'notify_offenses:test_options', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'notify_offenses:test_options']);

};
