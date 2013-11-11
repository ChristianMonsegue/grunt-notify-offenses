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

    // Configuration to be run.
    notify_inline_offenses: {
      default: {
        options: {
          save: false,
          stout: 'plaintext',
          output: 'plaintext',
          override: false,
          offenses : {
            "bloop": {
              message: 'Erroneous attribute.',
              pattern: ['bloop[\\s\\t]*=[\\s\\t]*(\"|\')[\\s\\ta-z0-9\\-\\:\\;{}\\/\\(\\)\\+\\=\\&\\%\\#\\@\\!\\,\\$_\"\']*(\"|\')', 'global', 'i']
            }
          },
          force: true,
          tabwidth: 4,
          cleaner: 'trailing'
        },
        files: {
          'tmp/inline-result': ['test/fixtures/inline1.html']
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
