'use strict';
const unless    = require('koa-unless');
const verifyJWT = require('./verify-jwt');

module.exports = opts => {
  opts = opts || {};
  opts.key = opts.key || 'user';

  const tokenResolvers = [resolveCookies, resolveAuthorizationHeader];

  if (opts.getToken && typeof opts.getToken === 'function') {
    tokenResolvers.unshift(opts.getToken);
  }

  const identity = user => user;
  const isRevoked = opts.isRevoked
      ? (ctx, token) => user => opts.isRevoked(ctx, user, token).then(revocationHandler(user))
      : () => identity;

  const middleware = function jwt(ctx, next) {
    let token;
    tokenResolvers.find((resolver) => token = resolver(ctx, opts));

    if (!token && !opts.passthrough) {
      ctx.throw(401, 'No authentication token found\n');
    }

    const secret = ctx.state && ctx.state.secret || opts.secret;
    if (!secret) {
      ctx.throw(401, 'Invalid secret\n');
    }

    return verifyJWT(token, secret, opts)
      .then(isRevoked(ctx, token))
      .then(user => {
        ctx.state = ctx.state || {};
        ctx.state[opts.key] = user;
      })
      .catch(e => {
        if (!opts.passthrough) {
          const msg = 'Invalid token' + (opts.debug ? ' - ' + e.message : '') + '\n';
          ctx.throw(401, msg);
        }
      })
      .then(next);
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

  const parts = ctx.header.authorization.split(' ');

  if (parts.length === 2) {
    const scheme = parts[0];
    const credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      return credentials;
    }
  }
  if (!opts.passthrough) {
    ctx.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
  }
}

/**
 * resolveCookies - Attempts to retrieve the token from a cookie
 *
 * This function uses the opts.cookie option to retrieve the token
 *
 * @param {Object}        ctx  The ctx object passed to the middleware
 * @param {Object}        opts This middleware's options
 * @return {String|null|undefined}  The resolved token or null if not found or undefined if opts.cookie is not set
 */
function resolveCookies(ctx, opts) {
  return opts.cookie && ctx.cookies.get(opts.cookie);
}

function revocationHandler(user) {
  return revoked => revoked
    ? Promise.reject(new Error('Revoked token'))
    : Promise.resolve(user);
}
