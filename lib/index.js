'use strict';

const unless = require('koa-unless');
const verify = require('./verify');
const getSecret = require('./get-secret');
const Promise = require("bluebird");
const resolveAuthHeader = require('./resolvers/auth-header');
const resolveCookies = require('./resolvers/cookie');

module.exports = (opts = {}) => {
    const { debug, getToken, isRevoked, key = 'user', passthrough, tokenKey } = opts;
    const tokenResolvers = [resolveCookies, resolveAuthHeader];

    if (getToken && typeof getToken === 'function') {
        tokenResolvers.unshift(getToken);
    }

    const middleware = async function jwt(ctx, next) {
        let token;
        tokenResolvers.find(resolver => token = resolver(ctx, opts));

        if (!token && !passthrough) {
            ctx.throw(401, debug ? 'Token not found' : 'Authentication Error');
        }

        let { state: { secret = opts.secret } } = ctx;

        try {
            if (!secret) {
                throw new Error('Secret not provided');
            }

            let secrets = Array.isArray(secret) ? secret : [secret];
            const decodedTokens = secrets.map(async (s) => {
                if (typeof s === 'function') {
                    s = await getSecret(s, token)
                }
                return await verify(token, s, opts)
            });

            const decodedToken = await Promise
                .any(decodedTokens)
                .catch(Promise.AggregateError, function (err) {
                    err.forEach(function (e) {
                        throw e;
                    });
                });

            if (isRevoked) {
                const tokenRevoked = await isRevoked(ctx, decodedToken, token);
                if (tokenRevoked) {
                    throw new Error('Token revoked');
                }
            }

            ctx.state[key] = decodedToken;
            if (tokenKey) {
                ctx.state[tokenKey] = token;
            }

        } catch (e) {
            if (!passthrough) {
                const msg = debug ? e.message : 'Authentication Error';
                ctx.throw(401, msg, { originalError: e });
            }
        }

        return next();
    };

    middleware.unless = unless;
    return middleware;
};
