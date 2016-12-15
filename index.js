/* @flow */

import assert from 'assert';
import thunkify from 'thunkify';
import _JWT from 'jsonwebtoken';
import unless from 'koa-unless';
import util from 'util';

// Make verify function play nice with co/koa
const JWT = {decode: _JWT.decode, sign: _JWT.sign, verify: thunkify(_JWT.verify)};

export default (opts) => {
  opts = opts || {};
  opts.key = opts.key || 'user';

  const tokenResolvers = [resolveCookies, resolveAuthorizationHeader];

  if (opts.getToken && util.isFunction(opts.getToken)) {
    tokenResolvers.unshift(opts.getToken);
  }

  async function middleware(next) {
    let token, msg, user, parts, scheme, credentials, secret;

    for (let i = 0; i < tokenResolvers.length; i++) {
      const output = tokenResolvers[i].call(this, opts);

      if (output) {
        token = output;
        break;
      }
    }

    if (!token && !opts.passthrough) {
      this.throw(401, 'No authentication token found\n');
    }

    secret = (this.state && this.state.secret) ? this.state.secret : opts.secret;
    if (!secret) {
      this.throw(500, 'Invalid secret\n');
    }

    try {
      user = await JWT.verify(token, secret, opts);
    } catch(e) {
      msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
    }

    if (user || opts.passthrough) {
      this.state = this.state || {};
      this.state[opts.key] = user;
      await next;
    } else {
      this.throw(401, msg);
    }

    this.unless = unless;
  }

  // middleware.unless = unless;

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
const resolveAuthorizationHeader = (opts) => {
  if (!this.header || !this.header.authorization) {
    return;
  }

  const parts = this.header.authorization.split(' ');

  if (parts.length === 2) {
    const scheme = parts[0];
    const credentials = parts[1];

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
const resolveCookies = (opts) => {
  if (opts.cookie && this.cookies.get(opts.cookie)) {
    return this.cookies.get(opts.cookie);
  }
}

// Export JWT methods as a convenience
export const sign = _JWT.sign;
export const verify = _JWT.verify;
export const decode = _JWT.decode;
