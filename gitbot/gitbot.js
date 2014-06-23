var request = require('request')
  , _       = require('lodash')
  , async   = require('async')
  , table   = require('text-table')
  , config  = require('./config.json')
  , SlackBot = require(process.cwd() + '/lib/slackbot')
  


exports.gitbot = function (req, res, next) {
  var gitbot = new SlackBot(req.body, config.bot);
  var directive = gitbot.directive.text;

  function cb (e, m) {
    gitbot.reply(e || m, function (e, payload) {
      res.bot = payload;
      return next();
    });
  }

  if (gitbot.checkTriggers(config.bot.triggers, req.body.trigger_word)) {
    switch (true) {

      case /list/i.test(directive):
        list(cb);
        break;

      case directive === '':
        list(cb);
        break;

      default:
        return next();
    }

  } else {
    next();
  }
}

function list (callback) {
  var username     = config.github.username
  var token        = config.github.token;
  var teams        = config.github.teams;
  var tasks        = []


  function getPulls (name, owner, repo, contributors) {
    return function (callback) {
      request({
        uri : 'https://api.github.com/repos/' + owner + '/' + repo + '/pulls',
        method : 'GET',
        json : true,
        headers : {
          'User-Agent'    : username,
          'Authorization' : 'token ' + token
        }
      }, function (error, response, body) {

        var pr = {
          'name'  : name,
          'owner' : owner,
          'repo'  : repo
        }

        if (error || !body) {
          pr.total = error || 'N/A';

        } else {
          var team = _.filter(body, function (e, i) {
              return _.contains(contributors, e.user.login);
            });
          pr.teamTotal = team.length;
          pr.total = body.length;
        }

        callback(null, pr);
      });
    }
  }

  _.each(teams, function (e, i) {
    var owner = e.owner;
    var name = e.name;
    var repos = e.repos;
    var contributors = e.contributors

    _.each(repos, function (f, j) {
      tasks.push(getPulls(name, owner, f, contributors));
    });
  });


  async.parallel(tasks, function (error, result) {
    if (error) { return callback(error); }

    var groups = _(result).sortBy('teamTotal').groupBy(function (pr) { return pr.name }).value();
    var tables = [];

    for (var key in groups) {
      if (!groups.hasOwnProperty(key)) { continue; }
      tables.push(makeTable(key, groups[key].reverse()));
    }

    tables = tables.join('\n\n');

    callback(null, tables);
  });


  function makeTable (name, pullRequests) {
    var tableArr = [
      [name + ' PRs'],
      ['- - - - -']
    ];

    _.each(pullRequests, function (e, i) {
      tableArr.push([
        e.teamTotal + ' (' + e.total + ')',
        '<https://github.com/' + e.owner + '/' + e.repo + '/pulls|' + e.repo + '>'
      ]);
    });

    var t = table(tableArr, {
      align: ['l', 'l'],
      hsep: ' | '
    });

    return t;
  }
}


