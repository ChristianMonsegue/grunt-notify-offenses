'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.notify_offenses = {
  setUp: function( done ) {
    // setup here if necessary
    done();
  },
  defaultWithSave: function( test ) {
    test.expect(4);
    var path = 'test/expected/default_with_save/';

    var actual = grunt.file.read('tmp/no-inline-html');
    var expected = grunt.file.read(path + 'no-inline-html-ex');
    test.equal(actual, expected, 'There should only be the "Checking File" title and the number of offenses, which is = 0.');

    actual = grunt.file.read('tmp/basic-inline-html');
    expected = grunt.file.read(path + 'basic-inline-html-ex');
    test.equal(actual, expected, 'There should only be STYLE, ALIGN, and JAVASCRIPT offenses searched.');

    actual = grunt.file.read('tmp/basic-js-console-log');
    expected = grunt.file.read(path + 'basic-js-console-log-ex');
    test.equal(actual, expected, 'There should only be CONSOLE LOG offenses searched.');

    actual = grunt.file.read('tmp/basic-inline-cbd');
    expected = grunt.file.read(path + 'basic-inline-cbd-ex');
    test.equal(actual, expected, 'There should no offenses found as .cbd is not a covered extension in the pre definied offenses.');

    test.done();
  },
  userOffenseToXML: function( test ) {
    test.expect(4);
    var path = 'test/expected/user_offense_to_xml/';
    
    var actual = grunt.file.read('tmp/user-xml-no-inline-html');
    var expected = grunt.file.read(path + 'user-xml-no-inline-html-ex');
    test.equal(actual, expected, 'There should only be the "Checking File" title and the number of offenses, which is = 0 and output should be in XML.');

    actual = grunt.file.read('tmp/user-xml-inline-html');
    expected = grunt.file.read(path + 'user-xml-inline-html-ex');
    test.equal(actual, expected, 'There should be STYLE, ALIGN, and JAVASCRIPT offenses searched, as well as the user defined ERRONEOUS offense, and output should be in XML.');

    actual = grunt.file.read('tmp/user-xml-js-console-log');
    expected = grunt.file.read(path + 'user-xml-js-console-log-ex');
    test.equal(actual, expected, 'There should only be CONSOLE LOG offenses searched and output should be in XML.');

    actual = grunt.file.read('tmp/user-xml-inline-cfm');
    expected = grunt.file.read(path + 'user-xml-inline-cfm-ex');
    test.equal(actual, expected, 'There should be STYLE, ALIGN, and JAVASCRIPT offenses searched, but the user defined ERRONEOUS offense should not be searched, and output should be in XML.');

    test.done();
  },
  ucoToJSON: function( test ) {
    test.expect(4);
    var path = 'test/expected/uco_to_json/';
    
    var actual = grunt.file.read('tmp/uco-json-no-inline-html');
    var expected = grunt.file.read(path + 'uco-json-no-inline-html-ex');
    test.equal(actual, expected, 'There should only be the "Checking File" title and the number of offenses, which is = 0 and output should be in JSON.');

    actual = grunt.file.read('tmp/uco-json-inline-html');
    expected = grunt.file.read(path + 'uco-json-inline-html-ex');
    test.equal(actual, expected, 'There should be ALIGN, and JAVASCRIPT offenses searched, as well as the user defined ERRONEOUS offense and the user-defined STYLE offense since it was overriden, all spaces in the offending lines should be removed, and output should be in JSON.');

    actual = grunt.file.read('tmp/uco-json-js-console-log');
    expected = grunt.file.read(path + 'uco-json-js-console-log-ex');
    test.equal(actual, expected, 'There should only be CONSOLE LOG offenses searched, all spaces in the offending line should be removed, and output should be in JSON.');

    actual = grunt.file.read('tmp/uco-json-inline-cbd');
    expected = grunt.file.read(path + 'uco-json-inline-cbd-ex');
    test.equal(actual, expected, 'There should be only 2 user-defined STYLE offenses searched since the extension for style was overridden, all spaces in the offending lines should be removed, and output should be in JSON.');

    test.done();
  }
};
