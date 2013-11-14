'use strict';

var collectionFactory = require('./collectionFactory');

function readEachColumn ( offending_line, parser ) {
  var offending_column,
      column_number,
      column_type,
      column_message,
      output = '';
  while (offending_line.hasNext()) {
    offending_column = offending_line.getNext();
    column_number = offending_column.getColumnNumber();
    column_type = offending_column.getOffenseType();
    column_message = offending_column.getMessage();
    output += parser.parseLocation(column_type,
                                    column_number,
                                    column_message);
  }
  offending_line.resetPointer();
  return output;
}

function readEachLine ( offending_file, parser ) {
  var filepath,
      offending_line,
      line,
      line_num,
      output;
  filepath = offending_file.getFilePath();
  output = parser.parseHeader(filepath);
  if(offending_file.getLength() === 0) {
    output += parser.parseFooter(offending_file.getTotalOffenses());
  } else {
    while (offending_file.hasNext()) {
      offending_line = offending_file.getNext();
      line = offending_line.getLine();
      line_num = offending_line.getLineNumber();
      output += parser.parseStartLine(line_num) +
                readEachColumn(offending_line, parser);
      output += parser.parseSource(line) +
                parser.parseEndLine();
    }
    offending_file.resetPointer();
    output += parser.parseFooter(offending_file.getTotalOffenses());
  }
  return output;
}

function readEachFile ( assembled_files_collection, parser ) {
  var parsed_files_collection = collectionFactory.createCollection(),
      parsed_file;
  parsed_files_collection.addElement(parser.parseStart());
  while (assembled_files_collection.hasNext()){
      parsed_file = readEachLine(assembled_files_collection.getNext(),
                                parser);
      parsed_files_collection.addElement(parsed_file);
    }
    assembled_files_collection.resetPointer();
  parsed_files_collection.addElement(parser.parseEnd());
  return parsed_files_collection;
}

//INTERFACE
exports.read = function ( input, parser ) {
  return readEachFile( input, parser );
};