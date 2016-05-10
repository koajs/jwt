'use strict';

const assert = require('assert');
const _JWT = require('jsonwebtoken');
const unless = require('koa-unless');
const util = require('util');

module.exports = function (opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';
  
  let tokenResolvers = [resolveCookies, resolveAuthorizationHeader];
  
  if (opts.getToken && util.isFunction(opts.getToken)) {
    tokenResolvers.unshift(opts.getToken);
  }
  
  const middleware = function (ctx, next) {
    let token, msg, user, parts, scheme, credentials, secret;
    
    for (let i = 0; i < tokenResolvers.length; i++) {
      var output = tokenResolvers[i].call(ctx, opts);
      
      if (output) {
        token = output;
        break;
      }
    }
    
    if (!token && !opts.passthrough) {
      ctx.status = 401;
      ctx.message = 'No authentication token found\n';
      return;
    }
    
    secret = (ctx.state && ctx.state.secret) ? ctx.state.secret : opts.secret;
    if (!secret) {
      ctx.status = 500;
      ctx.message = 'Invalid secret\n';
      return;
    }
    
    return new Promise((resolve, reject)=> {
      _JWT.verify(token, secret, opts, (err, user)=> {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      })
    }).then(user=> {
      ctx.state = ctx.state || {};
      ctx.state[opts.key] = user;
      next();
    }).catch(err=> {
      if (opts.passthrough) {
        return next();
      }
      ctx.status = 401;
      msg = 'Invalid token' + (opts.debug ? ' - ' + err.message + '\n' : '\n');
      ctx.message = msg;
    });
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
  
  let parts = this.header.authorization.split(' ');
  
  if (parts.length === 2) {
    let scheme = parts[0];
    let credentials = parts[1];
    
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

// Export JWT methods as a convenience
module.exports.sign = _JWT.sign;
module.exports.verify = _JWT.verify;
module.exports.decode = _JWT.decode;
