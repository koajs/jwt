koa-jwt
=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Coveralls][coveralls-image]][coveralls-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![license][license-image]][license-url]

[npm-image]: https://img.shields.io/npm/v/koa-jwt.svg?maxAge=2592000&style=flat-square
[npm-url]: https://npmjs.org/package/koa-jwt
[travis-image]: https://img.shields.io/travis/koajs/jwt/koa-v2.svg?maxAge=2592000&style=flat-square
[travis-url]: https://travis-ci.org/koajs/jwt
[coveralls-image]: https://img.shields.io/coveralls/koajs/jwt/koa-v2.svg?maxAge=2592000&style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/jwt?branch=koa-v2
[node-image]: https://img.shields.io/node/v/koa-jwt.svg?maxAge=2592000&style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/koa-jwt.svg?maxAge=2592000&style=flat-square
[download-url]: https://npmjs.org/package/koa-jwt
[license-image]: https://img.shields.io/npm/l/koa-jwt.svg?maxAge=2592000&style=flat-square
[license-url]: https://github.com/koajs/jwt/blob/koa-v2/LICENSE

Koa middleware that validates JSON Web Tokens and sets `ctx.state.user`
(by default) if a valid token is provided.

If you are using koa v1.x, please use the [master](https://github.com/koajs/jwt) branch and version 1.x of this project on npm.  
If you are using koa v2, use the [koa-v2](https://github.com/koajs/jwt/tree/koa-v2) branch and version 2.x of this project on npm.

This module lets you authenticate HTTP requests using JSON Web Tokens
in your [Koa](http://koajs.com/) (node.js) applications.

See [this article](http://blog.auth0.com/2014/01/07/angularjs-authentication-with-cookies-vs-token/)
for a good introduction.


## Install

```
$ npm install koa-jwt
```

## Usage

The JWT authentication middleware authenticates callers using a JWT
token. If the token is valid, `ctx.state.user` (by default) will be set
with the JSON object decoded to be used by later middleware for
authorization and access control.


### Retrieving the token

The token is normally provided in a HTTP header (`Authorization`), but it
can also be provided in a cookie by setting the `opts.cookie` option
to the name of the cookie that contains the token. Custom token retrieval
can also be done through the `opts.getToken` option. The provided function
should match the following interface:

```js
/**
 * Your custom token resolver
 * @this The ctx object passed to the middleware
 *
 * @param  {object}      opts The middleware's options
 * @return {String|null}      The resolved token or null if not found
 */
```

The resolution order for the token is the following. The first non-empty token resolved will be the one that is verified.
 - `opts.getToken` function
 - check the cookies (if `opts.cookie` is set)
 - check the Authorization header for a bearer token


### Passing the secret

Normally you provide a single shared secret in `opts.secret`, but another
alternative is to have an earlier middleware set `ctx.state.secret`,
typically per request. If this property exists, it will be used instead
of the one in `opts.secret`.


### Checking if the token is revoked

You can provide a async function to jwt for it check the token is revoked.
Only you set the function in `opts.isRevoked`. The provided function should
match the following interface:

```js
/**
 * Your custom isRevoked resolver
 *
 * @param  {object}      ctx The ctx object passed to the middleware
 * @param  {object}      token token The token
 * @param  {object}      user Content of the token
 * @return {Promise}     If the token is not revoked, the promise must resolve with false, otherwise (the promise resolve with false or error) the token is revoked
 */
```


## Example

```js
var Koa = require('koa');
var jwt = require('koa-jwt');

var app = new Koa();

// Custom 401 handling if you don't want to expose koa-jwt errors to users
app.use(function(ctx, next){
  return next().catch((err) => {
    if (401 == err.status) {
      ctx.status = 401;
      ctx.body = 'Protected resource, use Authorization header to get access\n';
    } else {
      throw err;
    }
  });
});

// Unprotected middleware
app.use(function(ctx, next){
  if (ctx.url.match(/^\/public/)) {
    ctx.body = 'unprotected\n';
  } else {
    return next();
  }
});

// Middleware below this line is only reached if JWT token is valid
app.use(jwt({ secret: 'shared-secret' }));

// Protected middleware
app.use(function(ctx){
  if (ctx.url.match(/^\/api/)) {
    ctx.body = 'protected\n';
  }
});

app.listen(3000);
```

Alternatively you can conditionally run the `jwt` middleware under certain conditions:

```js
var koa = require('koa');
var jwt = require('koa-jwt');

var app = new Koa();

// Middleware below this line is only reached if JWT token is valid
// unless the URL starts with '/public'
app.use(jwt({ secret: 'shared-secret' }).unless({ path: [/^\/public/] }));

// Unprotected middleware
app.use(function(ctx, next){
  if (ctx.url.match(/^\/public/)) {
    ctx.body = 'unprotected\n';
  } else {
    return next();
  }
});

// Protected middleware
app.use(function(ctx){
  if (ctx.url.match(/^\/api/)) {
    ctx.body = 'protected\n';
  }
});

app.listen(3000);
```

For more information on `unless` exceptions, check [koa-unless](https://github.com/Foxandxss/koa-unless).

You can also add the `passthrough` option to always yield next,
even if no valid Authorization header was found:
```js
app.use(jwt({ secret: 'shared-secret', passthrough: true }));
```
This lets downstream middleware make decisions based on whether `ctx.state.user` is set.


If you prefer to use another ctx key for the decoded data, just pass in `key`, like so:
```js
app.use(jwt({ secret: 'shared-secret', key: 'jwtdata' }));
```
This makes the decoded data available as `ctx.state.jwtdata`.

You can specify audience and/or issuer as well:
```js
app.use(jwt({ secret:   'shared-secret',
              audience: 'http://myapi/protected',
              issuer:   'http://issuer' }));
```
If the JWT has an expiration (`exp`), it will be checked.

If the `tokenKey` option is present, and a valid token is found, the original raw token
is made available to subsequent middleware as `ctx.state[opts.tokenKey]`.

This module also support tokens signed with public/private key pairs. Instead
of a secret, you can specify a Buffer with the public key:

```js
var publicKey = fs.readFileSync('/path/to/public.pub');
app.use(jwt({ secret: publicKey }));
```

RSA algorithm is also supported by providing jwks-rsa.expressJwtSecret callback in the
`secret` config option:
```js
app.use(jwt({ secret:   jwks-rsa.expressJwtSecret({
                          jwksUri: 'https://sandrino.auth0.com/.well-known/jwks.json'
                        }),
              audience: 'http://myapi/protected',
              issuer:   'http://issuer' }));
```


## Related Modules

- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — JSON Web Token signing
and verification

Note that koa-jwt no longer exports the `sign`, `verify` and `decode` functions from `jsonwebtoken` in the koa-v2 branch.


## Tests

    $ npm install
    $ npm test


## Author

Stian Grytøyr


## Credits

This code is largely based on [express-jwt](https://github.com/auth0/express-jwt).

  - [Auth0](http://auth0.com/)
  - [Matias Woloski](http://github.com/woloski)


## Contributors
- [Foxandxss](https://github.com/Foxandxss)
- [soygul](https://github.com/soygul)
- [tunnckoCore](https://github.com/tunnckoCore)
- [getuliojr](https://github.com/getuliojr)
- [cesarandreu](https://github.com/cesarandreu)
- [michaelwestphal](https://github.com/michaelwestphal)
- [sc0ttyd](https://github.com/sc0ttyd)
- [Jackong](https://github.com/Jackong)
- [danwkennedy](https://github.com/danwkennedy)
- [nfantone](https://github.com/nfantone)
- [scttcper](https://github.com/scttcper)
- [jhnns](https://github.com/jhnns)


## License

[The MIT License](http://opensource.org/licenses/MIT)
