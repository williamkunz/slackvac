var request = require('request')
  , _       = require('lodash')
  , async   = require('async')
  , cheerio = require('cheerio')
  , summarizer = require('node-summary')
  , config = require('./config')
  , SlackBot = require(process.cwd() + '/lib/slackbot')
  , helpers = require(process.cwd() + '/lib/helpers')

exports.wikibot = function (req, res, next) {
  var wikibot = new SlackBot(req.body, config.bot);
  var directive = wikibot.directive.text;
  var team = config.team;
  var token = config.token;

  function cb (e, m) {
    wikibot.reply(e || m, function (e, payload) {
      //delete(payload.channel);
      res.bot = payload;
      return next();
    });
  }

  if (wikibot.checkTriggers(config.bot.triggers, req.body.trigger_word)) {
    switch (true) {

      case /hello/i.test(directive):
        hello(cb);
        break;

      case /rules/i.test(directive):
        rules(cb);
        break;

      case /link/i.test(directive):

        if (/popular/i.test(directive)) {
          linkPopular(wikibot, cb);
          break;

        } else if (/recent/i.test(directive)) {
          linkRecent(cb);
          break;

        } else {
          link(cb);
          break;
        }

      case /start/i.test(directive):
        var fair = /fair/i.test(directive)
        start(wikibot, fair, cb);
        break;

      case directive === '':
        hello(cb);
        break;

      default:
        return next();
    }

  } else {
    next();
  }
}


// greet the user
function hello (callback) {
  var phrases = config.phrases
    , max     = phrases.length - 1
    , min     = 0
    , index   = helpers.rand(min, max);

  callback(null, phrases[index]);
}

// display the rules
function rules (callback) {
  var rules = "Rules: " +
    "\n- Start from the Random link on the sidebar." +
    "\n- No keyboards." +
    "\n- No back button (unless you end up outside Wikipedia).";

  callback(null, rules);
}


// retrieve a random link
function link (callback) {
  var uri = 'http://en.wikipedia.org/wiki/Special:Random'

  request({
    uri            : uri,
    method         : 'GET',
    followRedirect : true
  }, function (error, response, body) {
    if (error) { return callback(error); }

    var link = response.request.href
      , $ = cheerio.load(body)
      , title = $('h1#firstHeading > span').text()
      , content = $('div#mw-content-text > :not(table)').text()
      , summary = null

    summarizer.summarize(title, content, function (err, summary) {
      if (err) { return callback(err); }
      var message = '<' + link + '>'
                  + '\n' + summary;

      callback(null, message);
    });
  })
}

function linkPopular (bot, callback) {
  var options = {
      team : team,
      token : token
    }

  request({
    uri: 'http://en.wikipedia.org/wiki/User:West.andrew.g/Popular_pages'
  }, function (error, response, body) {
    // if (error) {
    //   return callback(error);
    // }

    var $ = cheerio.load(body)
    , table = $('.wikitable').last()
    , data
    , link;
    // remove the header row
    table.find('tr').first().remove();

    data = $('.wikitable').last().find('tr').map(function() {
       var $this = $(this)
       , href
       , article = {};

       href = $this.find('a');

       if (href.length) {
         article.id = $this.find('a').attr('href').split('/').pop();
         article.href = 'http://en.wikipedia.org/wiki/' + article.id;
         return article;
       }
    });

    link = _(data).compact().shuffle().value().pop();
    options.message = '<' + link.href + '>';
    bot.send(options, function (e, status) { return; })
    //callback(null, '<' + link.href + '>');
  });

  callback(null, '');
}

function linkRecent (callback) {
  var uri = 'http://en.wikipedia.org/wiki/Portal:Current_events'

  request({
    uri            : uri,
    method         : 'GET',
    followRedirect : true
  }, function (error, response, body) {
    if (error) { return callback(error); }

    var $ = cheerio.load(body)
      , links0 = $('div#mw-content-text > table').eq(1).find('a').map(function () { return $(this); })
      , links1 = $('div#mw-content-text > table').eq(2).find('a:not(.external)').map(function () { return $(this); })
      , links = links0.toArray().concat(links1.toArray())
      , link = 'http://en.wikipedia.org' + links[helpers.rand(0, links.length)].attr('href')

    callback(null, link);
  })
}

function start (bot, fair, callback) {
  var options = {
      team : team,
      token : token
    }
    , line = '<http://en.wikipedia.org/wiki/Special:Random|GO!!!>'
    , count = 3

  async.doUntil(
    function (callback) {
      options.message = count;
      setTimeout(function () {
        if (count === 0) {
          options.message = line;

          if (fair) {
            request({
              uri            : 'http://en.wikipedia.org/wiki/Special:Random',
              method         : 'GET',
              followRedirect : true
            }, function (error, response, body) {
              if (error) { return callback(error); }

              line = response.request.href
              line = '<' + line + '|GO!!!>';

              options.message = line;
              bot.send(options, callback);
            })

          } else {
            bot.send(options, callback);
          }
          
        } else {
          bot.send(options, callback);
        }
      }, 1000);
    }
  , function () {
      return count-- === 0;
    }
  , function (err) {
    return;
  });

  callback(null, '');
}



