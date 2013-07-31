/* jshint node: true */
'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    jasmine: {
      typify: {
        src: 'lib/**/*.js',
        options: {
          specs: 'spec/*Spec.js',
          helpers: 'spec/*Helper.js'
        }
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js',
        options: {
          node: true,
        },
      },
      lib: {
        src: ['lib/**/*.js']
      },
      spec: {
        src: ['spec/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib']
      },
    },
  });

  // Tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');

  // Default task.
  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test', ['jshint', 'jasmine']);
  grunt.registerTask('jasmine-build', ['jasmine:typify:build']);
};
