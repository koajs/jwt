var assert   = require('assert');
var thunkify = require('thunkify');
var _JWT      = require('jsonwebtoken');

// Make verify function play nice with co/koa
var JWT = {decode: _JWT.decode, sign: _JWT.sign, verify: thunkify(_JWT.verify)};

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  assert(opts.secret, '"secret" option is required');

  return function *jwt(next) {
    var token, msg, user, parts;

    if (this.header.authorization) {
      parts = this.header.authorization.split(' ');
      if (parts.length === 2 && /^ApplePass$/i.test(parts[0])) {
        token = parts[1];
      } else {
        if (!opts.passthrough) {
          this.throw(401, 'Bad Authorization header format. Format is "Authorization: ApplePass <token>"\n');
        }
      }
    } else {
      if (!opts.passthrough) {
        this.throw(401, 'No Authorization header found\n');
      }
    }

    try {
      user = yield JWT.verify(token, opts.secret, opts);
    } catch(e) {
      msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
    }

    if (user || opts.passthrough) {
      this[opts.key] = user;
      yield next;
    } else {
      this.throw(401, msg);
    }
  };
};

// Export JWT methods as a convenience
module.exports.sign   = JWT.sign;
module.exports.verify = JWT.verify;
module.exports.decode = JWT.decode;
