var thunkify = require('thunkify');
var _JWT     = require('jsonwebtoken');
var unless   = require('koa-unless');
var url      = require('url');

// Make verify function play nice with co/koa
var JWT = {decode: _JWT.decode, sign: _JWT.sign, verify: thunkify(_JWT.verify)};

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  var middleware = function *jwt(next) {
    var token, msg, user, parts, scheme, credentials, secret, passthrough;

    if (opts.passthrough instanceof RegExp) {
      passthrough = opts.passthrough.test(url.parse(this.url).pathname || '');
    } else {
      passthrough = opts.passthrough;
    }

    if (opts.cookie) {
      token = this.cookies.get(opts.cookie);

      if (!token && !passthrough && !this.header.authorization) {
        this.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
      }
    }

    if (!token) {
      if (this.header.authorization) {
        parts = this.header.authorization.split(' ');
        if (parts.length == 2) {
          scheme = parts[0];
          credentials = parts[1];

          if (/^Bearer$/i.test(scheme)) {
            token = credentials;
          }
        } else {
          if (!passthrough) {
            this.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
          }
        }
      } else {
        if (!passthrough) {
          this.throw(401, 'No Authorization header found\n');
        }
      }
    }

    secret = (this.state && this.state.secret) ? this.state.secret : opts.secret;
    if (!secret) {
      this.throw(500, 'Invalid secret\n');
    }

    try {
      user = yield JWT.verify(token, secret, opts);
    } catch(e) {
      msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
    }

    if (user || passthrough) {
      this.state = this.state || {};
      this.state[opts.key] = user;
      yield next;
    } else {
      this.throw(401, msg);
    }
  };

  middleware.unless = unless;

  return middleware;
};

// Export JWT methods as a convenience
module.exports.sign   = _JWT.sign;
module.exports.verify = _JWT.verify;
module.exports.decode = _JWT.decode;
