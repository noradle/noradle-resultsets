exports.rsParse = require('./lib/RSParser').rsParse;

var fs = require('fs')
  , path = require('path')
  , prefix = 'lib'
  , fileCache = {}
  ;

exports.serveFile = function(res, fname){
  var content = fileCache[fname];
  if (!content) {
    try {
      content = fileCache[path] = fs.readFileSync(path.join(__dirname, prefix, fname));
    } catch (e) {
      res.setHead(404);
      res.end();
      return true;
    }
  }
  res.writeHead(200, {
    'Content-Length' : content.length.toString(),
    'Content-Type' : 'application/javascript',
    'Cache-Control' : 'public, max-age=86400'
  });
  res.end(content);
  return true;
};