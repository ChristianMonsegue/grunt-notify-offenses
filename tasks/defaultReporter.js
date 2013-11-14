var grunt,
    save = false;

var linefeed,
    block_space;

function reportParsedFiles ( dest, input, to_file) {
  var parsed_file,
      output_file = '';
  if(!to_file){ grunt.log.write(linefeed); }
  while (input.hasNext()) {
    parsed_file = input.getNext();
    if(to_file) {
      output_file += parsed_file;
    } else {
      grunt.log.write(parsed_file); 
    }
  }
  input.resetPointer();
  if(to_file && dest.dest !== undefined) {
    grunt.file.write(dest.dest, output_file.trim());
    grunt.log.writeln('---- ' + ('File "' + dest.dest + '" created.').white.bold + ' -----' + block_space);
  }
}

exports.init = function ( grunt_init, options ) {
  grunt = grunt_init;
  linefeed = grunt.util.linefeed;
  block_space = linefeed + linefeed + linefeed;
  if (typeof options.save === 'boolean') { save = options.save; }
};

exports.report = function ( destination, input, to_file ) {
  reportParsedFiles (destination, input, to_file);
  return true;
};