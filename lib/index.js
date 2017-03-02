'use strict';
const unless = require('koa-unless');
const verify = require('./verify');
const resolveAuthHeader = require('./resolvers/auth-header');
const resolveCookies = require('./resolvers/cookie');

module.exports = (opts = {}) => {

    const { debug, getToken, isRevoked, key='user', passthrough, tokenKey } = opts;
    const tokenResolvers = [resolveCookies, resolveAuthHeader];

    if (getToken && typeof getToken === 'function') {
        tokenResolvers.unshift(getToken);
    }

    const middleware = async function jwt(ctx, next) {
        let token;
        tokenResolvers.find(resolver => token = resolver(ctx, opts));

        if (!token && !passthrough) {
            ctx.throw(401, 'No authentication token found\n');
        }

        const { state: { secret = opts.secret } = {} } = ctx;
        if (!secret) {
            ctx.throw(401, 'Invalid secret\n');
        }

        try {
            const decodedToken = await verify(token, secret, opts);

            if (isRevoked) {
                const tokenRevoked = await isRevoked(ctx, decodedToken, token);
                if (tokenRevoked) {
                    throw new Error('Revoked token');
                }
            }

            ctx.state = ctx.state || {};
            ctx.state[key] = decodedToken;
            if (tokenKey) {
                ctx.state[tokenKey] = token;
            }

        } catch (e) {
            if (!passthrough) {
                const debugString = debug ? ` - ${e.message}` : '';
                const msg = `Invalid token${debugString}\n`;
                ctx.throw(401, msg);
            }
        }

        return next();
    };

    middleware.unless = unless;
    return middleware;
};
