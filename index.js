var fs = require('fs')
  , path = require('path')
  , prefix = 'lib'
  ;

exports.rsParse = require('./lib/RSParser').rsParse;
exports.fileRSParser = fs.readFileSync(path.join(__dirname, prefix, 'RSParser.js'));
exports.fileNGResultsetsConverter = fs.readFileSync(path.join(__dirname, prefix, 'ng-resultsets-converter.js'));
exports.fileJQResultsetsConverter = fs.readFileSync(path.join(__dirname, prefix, 'jq-resultsets-converter.js'));
