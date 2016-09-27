var assert   = require('assert');
var thunkify = require('thunkify');
var _JWT     = require('jsonwebtoken');
var unless   = require('koa-unless');
var util     = require('util');

// Make verify function play nice with co/koa
var JWT = {decode: _JWT.decode, sign: _JWT.sign, verify: thunkify(_JWT.verify)};

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  var tokenResolvers = [resolveCookies, resolveAuthorizationHeader];

  if (opts.getToken && util.isFunction(opts.getToken)) {
    tokenResolvers.unshift(opts.getToken);
  }

  var middleware = function *jwt(next) {
    var token, msg, user, parts, scheme, credentials, secret;

    for (var i = 0; i < tokenResolvers.length; i++) {
      var output = tokenResolvers[i].call(this, opts);

      if (output) {
        token = output;
        break;
      }
    }

    if (!token && !opts.passthrough) {
      this.throw(401, 'error.BadAuthorization.TokenNotFound');
    }

    secret = (this.state && this.state.secret) ? this.state.secret : opts.secret;
    if (!secret) {
      this.throw(401, 'error.BadAuthorization.InvalidSecret');
    }

    try {
      user = yield JWT.verify(token, secret, opts);
    } catch(e) {
      msg = 'error.BadAuthorization.InvalidToken' + (opts.debug ? '.' + e.message.capitalize() : '');
    }

    if (user || opts.passthrough) {
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


/**
 * resolveAuthorizationHeader - Attempts to parse the token from the Authorization header
 *
 * This function checks the Authorization header for a `Bearer <token>` pattern and return the token section
 *
 * @this The ctx object passed to the middleware
 *
 * @param  {object}      opts The middleware's options
 * @return {String|null}      The resolved token or null if not found
 */
function resolveAuthorizationHeader(opts) {
  if (!this.header || !this.header.authorization) {
    return;
  }

  var parts = this.header.authorization.split(' ');

  if (parts.length === 2) {
    var scheme = parts[0];
    var credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      return credentials;
    }
  } else {
    if (!opts.passthrough) {
      this.throw(401, 'error.BadAuthorization.InvalidHeaderFormat');
    }
  }
}


/**
 * resolveCookies - Attempts to retrieve the token from a cookie
 *
 * This function uses the opts.cookie option to retrieve the token
 *
 * @this The ctx object passed to the middleware
 *
 * @param  {object}      opts This middleware's options
 * @return {String|null}      The resolved token or null if not found
 */
function resolveCookies(opts) {
  if (opts.cookie && this.cookies.get(opts.cookie)) {
    return this.cookies.get(opts.cookie);
  }
}

/**
 * capitalize - Capitalize each first letter of a string and remove spaces.
 *
 * @return {String}   The capitalized string
 */
String.prototype.capitalize = function() {
    var splitStr = this.toLowerCase().split(' ');
   for (var i = 0; i < splitStr.length; i++) {
       splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
   }
   // Directly return the joined string
   return splitStr.join(''); 
}


// Export JWT methods as a convenience
module.exports.sign   = _JWT.sign;
module.exports.verify = _JWT.verify;
module.exports.decode = _JWT.decode;
