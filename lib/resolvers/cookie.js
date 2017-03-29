/**
 * resolveCookies - Attempts to retrieve the token from a cookie
 *
 * This function uses the opts.cookie option to retrieve the token
 *
 * @param {Object}        ctx  The ctx object passed to the middleware
 * @param {Object}        opts This middleware's options
 * @return {String|null|undefined}  The resolved token or null if not found or undefined if opts.cookie is not set
 */
module.exports = function resolveCookies(ctx, opts) {
    return opts.cookie && ctx.cookies.get(opts.cookie);
};
