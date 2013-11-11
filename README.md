# grunt-notify-inline-offenses

> Searches through a list of files and notifies on all declarative inline css.

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

###Finder Options

#### options.finder.override
Type: `Boolean`
Default value: `false`

A boolean value that determines if the user-defined offenses will override the pre-defined offenses given that their types are equivalent, regardless of case. For example, if the type of a user-defined offense is "css", and the overwrite option is set to true, then the pre-defined "CSS" offense will be overridden. Keep in mind that overriding will ONLY work if the user-defined offense has both a type and valid pattern, else it will fall back to the pre-defined offense of the same type.

#### options.finder.offenses
Type: `Object Literal`
Default value: `{}`

An object literal that contains each user-defined offense. The key of each entry is the type and the value is another object literal that contains a `String` message and an 'Array' pattern. The pattern itself should have the regular expression at the first index, and at every subsequent index is a regex modifier.

### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result would be `Testing, 1 2 3.`

```js
grunt.initConfig({
  notify_inline_css: {
    options: {},
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
})
```

#### Custom Options
In this example, custom options are used to do something else with whatever else. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result in this case would be `Testing: 1 2 3 !!!`

```js
grunt.initConfig({
  notify_inline_css: {
    options: {
      separator: ': ',
      punctuation: ' !!!',
    },
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
