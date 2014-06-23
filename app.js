
/**
 * Module dependencies.
 */

var express = require('express');
var http    = require('http');

  
// bots
var wikibot = require('./wikibot').wb;
var gitbot  = require('./gitbot/gitbot');


var app = express();


// send bot response back as json
function sendResponse (req, res) {
  res.json(200, res.bot || {});
}


// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);

// send error as bot response
app.use(function (err, req, res, next) {
  var code = err && err.code || 200;
  var text = err && err.text || '';
  console.log(err);
  res.json(code, { text: text });
});

// bot routes
app.post('/wikibot', wikibot.wikibot, sendResponse);
app.post('/gitbot', gitbot.gitbot, sendResponse);

http.createServer(app).listen(app.get('port'), function(){
  console.log('SLACKVAC ' + app.get('port') + ' online.');
});
