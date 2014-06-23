var util = require('util');
var _ = require('lodash');
var request = require('request');


module.exports = SlackBot;


function SlackBot (inPayload, options) {
  // make first param optional
  // auto check triggers
  // auto get directive

  this.name = options.name;
  this.icon = options.icon;
  this.channel = options.channel || inPayload.channel_name || '';

  if (this.channel && this.channel.indexOf('@') < 0 && this.channel.indexOf('#') < 0) {
    this.channel = '#' + this.channel;
  }

  this.directive = getDirective(inPayload.text, inPayload.trigger_word);

  this.payload = null;


  // token=l8EipXBlqOtIqo1UtnrvhmFb
  // team_id=T0001
  // channel_id=C2147483705
  // channel_name=test
  // timestamp=1355517523.000005
  // user_id=U2147483697
  // user_name=Steve
  // text=googlebot: What is the air-speed velocity of an unladen swallow?
  // trigger_word=googlebot:
 

}

SlackBot.prototype.reply = function (message, callback) {
  if (message) {
    this.text = message;
  }

  return callback(null, buildPayload.call(this));
}

// SlackBot.prototype.retort = function (request, response, callback) {
//   if (!response) {
//     callback('No response provided. Try sending the reply manually.');

//   } else if (typeof response.json === 'function') {
//     response.json(200, this.payload);

//   } else if (typeof response.send === 'function') {
//     response.send(200, this.payload);

//   } else {
//     callback('Cannot send. Try sending the reply manually.');
//   }
// }

SlackBot.prototype.send = function (options, callback) {
  if (typeof options === 'object') {
    this.text = options.text || options.message || this.message;
    this.team = options.team || this.team;
    this.token = options.token || this.token;
  } else if (typeof options === 'function' && !callback) {
    callback = options;
  }

  request({
    uri : 'https://' + this.team + '.slack.com/services/hooks/incoming-webhook',
    qs : {
      token : this.token
    },
    method : 'POST',
    body : buildPayload.call(this),
    json : true
  }, function (error, response, body) {
    if (error) { callback(error); }

    return callback(null, response.statusCode);
  })
}

SlackBot.prototype.checkTriggers = function (triggers, text) {
  if (!Array.isArray(triggers)) {
    triggers = [triggers];
  }
  return text && triggers.length && _.contains(triggers, text);
}


function getDirective (text, trigger) {
  var tokenized = text.split(' ');

  tokenized.shift();
  
  text = text.replace(new RegExp(trigger, 'i'), '');
  

  var directive = {
    text : text,
    tokens : tokenized
  }

  return directive;
}

function buildPayload () {
   var payload = {
    username : this.name,
    channel : this.channel,
    text : this.text
  }

  if (this.icon) {
    if (!this.icon.type) {
      this.icon = detectIconType(this.icon); 
    }

    payload[this.icon.type] = this.icon.icon;
  }

  return payload;
}


function detectIconType (iconName) {
  var isEmoji = /^:.+:$/.test(iconName);
  var isUrl = /^http.+\.[a-z]{3}$/.test(iconName);
  var icon = { icon : iconName };

  if (!iconName) {
    return {};
  } else if (isEmoji) {
    icon.type = 'icon_emoji';
  } else if (isUrl) {
    icon.type = 'icon_url';
  }

  return icon;
}
