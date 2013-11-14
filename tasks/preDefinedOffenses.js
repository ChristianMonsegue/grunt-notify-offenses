'use strict';

/* Holds objects with key type and pattern in a collection as search
*  criteria for offenses.
*/
var pre_defined_offenses =
[
  {
    type: 'STYLE',
    pattern: /style[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*>/gi,
    message: 'Style attributes should belong in a .css or .less file.',
    extensions: ['html', 'cfm']
  },
  {
    type: 'ALIGN',
    pattern: /align[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*>/gi,
    message: 'Align attributes should belong in a .css or .less file.',
    extensions: ['html', 'cfm']
  },
  {
    type: 'JAVASCRIPT',
    pattern: /on[a-z]*[\s\t]*=[\s\t]*(\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*[\)|\;|\}](\"|\')[\s\ta-z0-9\-\:\;{}\\\/\(\)\+\=\&\%\#\@\!\,\.\$_\"\']*>/gi,
    message: 'Inline Javascript should belong in a .js file.',
    extensions: ['html', 'cfm']
  },
  {
    type: 'CONSOLE LOG',
    pattern: /console.log\(/gi,
    message: 'Console Log declaration detected. Please remove once finished testing.',
    extensions: ['js']
  }
];

exports.getPreDefinedOffenses = function () {
  return pre_defined_offenses;
};