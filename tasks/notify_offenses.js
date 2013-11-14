/*
 *  grunt-notify-offenses
 *  https://github.com/christian.monsegue/gruntplugins
 *
 *  Licensed under the MIT license.
 */



module.exports = function( grunt ) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('notify_offenses',
                          'Searches through a list of files and notifies on all declarative inline code.',
                          function() {

    /*Variable to solve scope issues when calling "this" functions*/
    var _self = this;

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      save: false,
      stout: 'plaintext',
      output: 'plaintext',
      offenses: {},
      force: true,
      override: false,
      tabwidth: 4,
      cleaner: 'none'
    });

    var collectionFactory = require('./collectionFactory');


    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Finder object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types.
    *
    *  Interface Finder {
    *    init ( grunt, options );
    *    find ( path, source, [items,]);
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var finder = require('./offendingColumnsByLineFinder');
    finder.init(grunt, options);



    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Assembler object that contains methods to search through for columns
    *  with offenses and save those columns in a OffendingColumn object based
    *  on stored offense types. It also builds the OffendingLine and
    *  the OffendingFile objects, and ties them together with the
    *  OffendingColumns object, thus "assembling" the separate parts into one.
    *
    *  Interface Assembler {
    *    init ( grunt, options );
    *    assemble ( base, operator );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var assembler = require('./OffendingFileDataAssembler');
    assembler.init(grunt, options);



    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Parser objects for parsing the assembled data objects for the reporter.
    *  These parsers will be injected into the reader.
    *
    *  Interface Parser {
    *   init ( grunt, options );
    *   parseStart();
    *   parseHeader ( header );
    *   parseStartLine ( row );
    *   parseLocation ( name, col, msg );
    *   parseSource ( source );
    *   parseEndLine ();
    *   parseFooter ( footer );
    *   parseEnd ();
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var stout_parser,
        output_parser;


    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Reader object that reads a collections of files using a source and a
    *  parser object.
    *  In more detail, this reader accesses each input file to get the required
    *  information it needs from it and then parses it into a format
    *  dictated by the injected parser.
    *
    *  Interface Reader {
    *    read ( input, parser );
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var reader = require('./offendingFilesReader');




    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Reporter object that takes an input and reports it to standard output
    *  and/or an output file.
    *
    *  Interface Reporter {
    *    init ( grunt, options );
    *    report ( destination, input, [options,]);
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var reporter =  require('./defaultReporter');
    reporter.init(grunt, options);




    /**************************************************************************
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    *
    *  Client object that executes all parts of the plugin while also taking
    *  into account user-defined options.
    *
    *  Interface Client {
    *    execute ();
    *  }
    *
    ***************************************************************************
    ***************************************************************************
    ***************************************************************************
    **************************************************************************/
    var Client = (function () {

      /* Loads the files given by the user in and saves their filepath and data
      *  in a collection.
      *
      *  @param file_block:  The "output: input" element of the files object
      *                      provided through the gruntfile that will be read.
      *
      *  returns             A collection containing the filepath and data of
      *                      each file.
      */
      function fileLoader ( file_block ) {
        var input_files_collection = collectionFactory.createCollection(),
            files = file_block.src.filter( function ( filepath ) {
              if (!grunt.file.exists(filepath)) {
                grunt.log.writeln('Source file "' + filepath + '" not found.');
                return false;
              } else {
                return true;
              }
            });
        for(var filepath in files){
            input_files_collection.addElement({
                                        path: files[filepath],
                                        data: grunt.file.read(files[filepath])
                                              });
        }
        return input_files_collection;
      }

      /* A case/switch function that determines which parser to use given
      *  the option provided by the user. It will default to the
      *  Decorated PlainText Parser on any erroneous or undefined option.
      *
      *  @param tag:  The user option that determines the parser to be used.
      *
      *  returns      The parser object that corresponds with the parameter.
      */
      function parserSwitch ( tag ) {
        var parser;
        if(grunt.file.isFile('tasks/user-parsers/' + tag)){
          var req_path = './user-parsers/' + tag;
          parser = require(req_path);
        }else{
          switch (tag.toString().toLowerCase())
          {
            case 'json':
              parser = require('./default-parsers/JSONParser');
              break;
            case 'minimalxml':
              parser = require('./default-parsers/minimalXMLParser');
              break;
            case 'plaintext':
              parser = require('./default-parsers/plainTextParser');
              break;
            case 'decoratedplaintext':
              parser = require('./default-parsers/decoratedPlainTextParser');
              break;
            default:
              parser = require('./default-parsers/plainTextParser');
          }
        }
        parser.init(grunt, options);
        return parser;
      }

      /* Builds the collection that holds all the files with their
      *  assembled data on offenses. Each assembled file is created
      *  using the OffendingFileDataAssembler object assemble() function.
      *
      *  @param collection:  The collection of input files to be used for
      *                      assembling the offense data.
      *
      *  returns             A collection of all the assembled offense data.
      */
      function buildAssembledFilesCollection ( collection ) {
        var assembled_file,
            assembled_files_collection = collectionFactory.createCollection();
        while (collection.hasNext()) {
          assembled_file = 
            assembler.assemble(
              collection.getNext(),
              finder);
          assembled_files_collection.addElement(assembled_file);
        }
        collection.resetPointer();
        return assembled_files_collection;
      }

      /* Runs the needed functions of this js file given by the user options
      *  and/or default options of the gruntfile.
      */
      function run () {

        _self.files.forEach( function ( file_block ) {
          var assembled_files_collection,
              parsed_files_collection,
              input_files_collection = fileLoader(file_block);

          if(input_files_collection.getLength() > 0) {
            //Find Offenses and print to standard output.
            assembled_files_collection =
                  buildAssembledFilesCollection(input_files_collection);
            stout_parser = parserSwitch(options.stout || 'plaintext');
            parsed_files_collection = reader.read(
                                  assembled_files_collection,
                                  stout_parser);
            reporter.report(file_block, parsed_files_collection);
            /*If save = true and the output file destination is valid, find
            offenses and write to output file.*/
            if(options.save === true && file_block.dest !== undefined) {
              output_parser = parserSwitch(options.output || 'plaintext');
              parsed_files_collection = reader.read(
                                  assembled_files_collection,
                                  output_parser);
              reporter.report(file_block,
                                      parsed_files_collection,
                                      true);
            } else if(options.save === true && file_block.dest === undefined) {
              //Eventually replace this with ErrorLog Object functions
              grunt.log.writeln(
                    ('WARNING: No destination file path was specified! Skipping "save" option!').
                    red.bold);
            }
          }
        });
      }

      return {
        execute: function () {
          run ();
        }
      };
    })();

    //Command to execute the gruntfile js functions.
    Client.execute();
  });

};