/**
 * resolveAuthorizationHeader - Attempts to parse the token from the Authorization header
 *
 * This function checks the Authorization header for a `Bearer <token>` pattern and return the token section
 *
 * @param {Object}        ctx  The ctx object passed to the middleware
 * @param {Object}        opts The middleware's options
 * @return {String|null}  The resolved token or null if not found
 */
module.exports = function resolveAuthorizationHeader(ctx, opts) {
    if (!ctx.header || !ctx.header.authorization) {
        return;
    }

    const parts = ctx.header.authorization.trim().split(' ');

    if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
            return credentials;
        }
    }
    if (!opts.passthrough) {
        ctx.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"');
    }
};
