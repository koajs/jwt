'use strict';
const assert    = require('assert');
const Promise   = require('bluebird');
const JWT       = Promise.promisifyAll(require('jsonwebtoken'));
const unless    = require('koa-unless');
const util      = require('util');

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  var tokenResolvers = [resolveCookies, resolveAuthorizationHeader];

  if (opts.getToken && util.isFunction(opts.getToken)) {
    tokenResolvers.unshift(opts.getToken);
  }

  var middleware = function jwt(ctx, next) {
    var token, parts, scheme, credentials, secret;

    for (var i = 0; i < tokenResolvers.length; i++) {
      var output = tokenResolvers[i](ctx, opts);

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

    return JWT.verifyAsync(token, secret, opts)
      .then((user) => {
        ctx.state = ctx.state || {};
        ctx.state[opts.key] = user;
      })
      .catch((e) => {
        if (!opts.passthrough) {
          let msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
          return ctx.throw(401, msg);
        }
      })
      .then(() => next())
  };

  middleware.unless = unless;

  return middleware;
};


/**
 * resolveAuthorizationHeader - Attempts to parse the token from the Authorization header
 *
 * This function checks the Authorization header for a `Bearer <token>` pattern and return the token section
 *
 * @param {Object}        ctx  The ctx object passed to the middleware
 * @param {Object}        opts The middleware's options
 * @return {String|null}  The resolved token or null if not found
 */
function resolveAuthorizationHeader(ctx, opts) {
  if (!ctx.header || !ctx.header.authorization) {
    return;
  }

  var parts = ctx.header.authorization.split(' ');

  if (parts.length === 2) {
    var scheme = parts[0];
    var credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      return credentials;
    }
  } else {
    if (!opts.passthrough) {
      ctx.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
    }
  }
}


/**
 * resolveCookies - Attempts to retrieve the token from a cookie
 *
 * This function uses the opts.cookie option to retrieve the token
 *
 * @param {Object}        ctx  The ctx object passed to the middleware
 * @param {Object}        opts This middleware's options
 * @return {String|null}  The resolved token or null if not found
 */
function resolveCookies(ctx, opts) {
  if (opts.cookie && ctx.cookies.get(opts.cookie)) {
    return ctx.cookies.get(opts.cookie);
  }
}
