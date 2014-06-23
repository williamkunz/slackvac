var config = require(process.cwd() + '/config.json')
var _ = require('lodash')


exports.teamAuth = function (req, res, next) {
  if (!req || !req.body || !req.body.team !== config.team) {
    var error = {
      code : 401,
      text : 'Invalid team'
    }
    return next(error);
  }

  return next();
}


exports.botAuth = function(triggers) {
  return function (req, res, next) {
    if (!req || !req.body || !_.contains(triggers, req.body.trigger_word) {
      return next('Invalid bot');
    }

    return next();
  }
}