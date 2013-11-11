# grunt-notify-inline-offenses

> Searches through a list of files and notifies on all declarative inline offenses.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-notify-inline-offenses --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-notify-inline-offenses');
```

## The "notify_inline_offenses" task

### Overview
In your project's Gruntfile, add a section named `notify_inline_offenses` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  notify_inline_offenses: {
    options: {
      // Task-specific options go here.
    },
    files: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

## Options

#### save
Type: `Boolean` _optional_
Default value: `false`

Determines if the output should be sent to both standard output **and** an output file. If set to `true`, then the result will be printed in the terminal and also be written into a new file specified in the files property.

###Finder Options

#### override
Type: `Boolean` _optional_
Default value: `false`

Determines if the user-defined offenses will override the pre-defined offenses given that their types are equivalent, regardless of case. For example, if the type of a user-defined offense is "css", and the override option is set to `true`, then the pre-defined "CSS" offense will be overridden. Keep in mind that overriding will **ONLY** work if the user-defined offense has both a type **and** a valid pattern, else it will fall back to the pre-defined offense of the same type.

#### force
Type: `Boolean` _optional_
Default value: `true`

Determines if the pre-defined offenses are also evaluated along with the user-defined offenses. If set to `true`, the pre-defined offenses are also considered in the search along with the user-defined offenses, else they are not when set to `false`. The option **force** is implied to be `true` if the user-defined offenses are undefined.

#### offenses
Type: `Object Literal` _optional_
Default value: `{}`

Contains each user-defined offense. The key of each entry is the offense type and the value is another object literal that contains a `String` message and an `Array` pattern. The pattern itself should have the regular expression at the first index, and at every subsequent index is a regex modifier.

```js
  notify_inline_offenses: {
    options: {
      offenses: {
        'type': {
          message: 'message',
          pattern: ['pattern', 'modifier',...]
        }
      }
    }
  }
```

######Type
The type is case-insensitive, so 'CSS' and 'css' are considered the same type.

######Message
The message **must** be a `String` value, else it will default to a string consisting of a single '\s' character.

######Pattern
The pattern uses the regexp function, so special characters **must** be double escaped. The only exceptions are single and double quotes, which can be single escaped and handled. The regex modifiers supported so far are:

* `global` Searches for _all_ matches of the pattern rather than the first match found. Can be entered as *global* or *g*.
* `case-insensitive`  Searches for a match of the pattern regardless of the alphabetical case. Can be entered as *case-insensitive* or *i*.

**All** entries in the pattern array **MUST** be a `String`.

###Assembler Options

#### tabwidth
Type: `Number` _optional_
Default value: `4`

Removes all tab characters at the beginning of each line from the file input and replace them with a new tabwidth, normalizing the data. It is highly recommended to equate the tabwidth to the tabwidth rule of jshint for full accuracy of the column numbers.

#### cleaner
Type: `String` _optional_
Default value: `'trailing'`

Cleans each line of the input file(s) of whitespaces based on a given option:

* `none` Does not clean the line.
* `trailing` Cleans the line of all whitespace at the beginning and end of the line.
* `no-tabs` Cleans the line of all '\t' whitespace.
* `no-spaces` Cleans the line of all '\s' whitespace.
* `all` Cleans the line of _all_ whitespace.

###Reporter Options

#### stout
Type: `String` _optional_
Default value: `'plaintext'`

Determines how the output will be printed through standard output.

* `plaintext` Outputs the results in a plaintext UTF-8 format.
* `decoratedplaintext` Outputs the results in a plaintext format with color and emphasis on key details.
* `minimalxml` Outputs the results in a very basic XML format.
* `json` Outputs the results in a JSON format that follows the ECMA standard.

#### output
Type: `String` _optional_
Default value: `'plaintext'`

Determines how the output will be written to an output file.

* `plaintext` Outputs the results in a plaintext UTF-8 format.
* `decoratedplaintext` Outputs the results in a plaintext format with color and emphasis on key details.
* `minimalxml` Outputs the results in a very basic XML format.
* `json` Outputs the results in a JSON format that follows the ECMA standard.

### Usage Examples

#### Default Options
In this example, the default options are used to look for offenses in a set of files. So with `tmp/inline-result` as my destination and `test/fixtures/inline1.html` as my source, the plugin does the following:

* Takes in the source file's filepath and data.
* Rearranges all tab characters at the front of each line to a **tabwidth** of `4`.
* Searches through the pre-defined list of offenses for any offending columns. Since no **offenses** were defined by the user and **override** is set to `false` and **force** is set to `true`, then the pre-defined offenses will all be checked and not overriden.
* The **cleaner** cleans each offending line of all `trailing` whitespace before sending them to the output (same as trim()).
* Outputs the offending data to the standard output (**stout**) in `plaintext` format. Since **save** is set to `false`, the offending data will not be considered to be written to an output file and the **output** option and the destination are ignored.

```js
grunt.initConfig({
  notify_inline_offenses: {
    default: {
      options: {
        save: false,
        stout: 'plaintext',
        output: 'plaintext',
        override: false,
        offenses : {},
        force: true,
        tabwidth: 4,
        cleaner: 'trailing'
      },
      files: {
        'tmp/inline-result': ['text/fixtures/inline1.html']
      },
    }
  }
})
```

## Release History
* **0.1.0**  -  11 November 2013  - First version, although I would argue that it is incredibly messy right now.
