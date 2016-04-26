'use strict';
var assert    = require('assert');
var JWT       = require('jsonwebtoken');
var unless    = require('koa-unless');
var util      = require('util');

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  var tokenResolvers = [resolveCookies, resolveAuthorizationHeader];

  if (opts.getToken && util.isFunction(opts.getToken)) {
    tokenResolvers.unshift(opts.getToken);
  }

  var middleware = function jwt(ctx, next) {
    var token, msg, user, parts, scheme, credentials, secret;

    for (var i = 0; i < tokenResolvers.length; i++) {
      var output = tokenResolvers[i].call(ctx, opts);

      if (output) {
        token = output;
        break;
      }
    }

    if (!token && !opts.passthrough) {
      ctx.throw(401, 'No authentication token found\n');
    }

    secret = (ctx.state && ctx.state.secret) ? ctx.state.secret : opts.secret;
    if (!secret) {
      ctx.throw(500, 'Invalid secret\n');
    }

    try {
      user = JWT.verify(token, secret, opts);
    } catch(e) {
      msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
    }

    if (user || opts.passthrough) {
      ctx.state = ctx.state || {};
      ctx.state[opts.key] = user;
      return next();
    } else {
      ctx.throw(401, msg);
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
      this.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
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
