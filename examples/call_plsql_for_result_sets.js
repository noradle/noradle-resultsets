/**
 * Created with JetBrains WebStorm.
 * User: kaven276
 * Date: 12-6-5
 * Time: 下午9:01
 */

function noop(){
}

var DBDriver = require('noradle-nodejs-client').DBDriver
  , NDBC = require('noradle-ndbc')
  , log = console.log
  , parse = require('noradle-resultsets').rsParse
  , servlet = 'demo1.db_src_b.basic'
  , inspect = require('util').inspect
  ;

// servlet = 'question.test_b.ds_post_tree';

// var tar = [9001, 'localhost'];
// var tar = [8001, 'noradle.com'];
// var tar = ['/tmp/inhub'];
var tar = [9009, 'localhost'];

var dbPool = DBDriver.connect(tar, {
  cid : 'demo',
  passwd : 'demo'
});

var dbc = new NDBC.DBCall(dbPool, {
  param1 : 'value1',
  param2 : 'value2',
  "h$content-type" : "application/json",
  __parse : false
});

//servlet = 'demo1.test_framework_b.use_bios';
// servlet = 'realname.import_c.save_json';

var data = {
  a : [1, 2, 3],
  b : {b1 : 1, b2 : 2},
  c : [
    {p1 : 1, p2 : 1},
    {p1 : 2, p2 : 2}
  ]
};

function UnitTest1(no){
  var limit = Math.pow(10, no);
  dbc.call(servlet, {limit : limit}, data, function(status, headers, page){
    if (status != 200) {
      console.error('status is', status);
      console.error(page);
      console.error(headers);
      return;
    }
    log('no=%s', no);
    log('servlet', servlet);
    log('status=%d', status);
    log('headers=\n%s', inspect(headers, {}, 2));
    log('typeof page=%s', typeof page);
    log(page);
    console.log('\r\n---------\r\n');
    if (typeof page === 'string') {
      if (headers['Content-Type'].match(/^text\/resultsets/)) {
        console.log('parsed text/resultsets:');
        console.log(inspect(parse(page), {depth : 8}));
      } else if (headers['Content-Type'].match(/^application\/json/)) {
        // got json response body
        console.log('pretty format json:');
        log(JSON.stringify(JSON.parse(page), null, 2));
      } else if (headers['Content-Type'].substr(0, 5) === 'text/') {
        console.log('plain text:');
        log(page);
      }
    } else {
      //console.log(inspect(page, {depth : 8}));
    }
  });
}

for (var i = 1; i <= 1; i++) {
  UnitTest1(i);
}
