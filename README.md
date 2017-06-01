# koa-jwt

[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![npm stats][npm-image]][npm-url]
[![test status][travis-image]][travis-url]
[![coverage][coveralls-image]][coveralls-url]
[![license][license-image]][license-url]

[npm-image]: https://img.shields.io/npm/v/koa-jwt.svg?maxAge=2592000&style=flat-square
[npm-url]: https://npmjs.org/package/koa-jwt
[travis-image]: https://img.shields.io/travis/koajs/jwt/master.svg?maxAge=3600&style=flat-square
[travis-url]: https://travis-ci.org/koajs/jwt
[coveralls-image]: https://img.shields.io/coveralls/koajs/jwt/master.svg?maxAge=2592000&style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/jwt
[node-image]: https://img.shields.io/node/v/koa-jwt.svg?maxAge=2592000&style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/koa-jwt.svg?maxAge=2592000&style=flat-square
[download-url]: https://npmjs.org/package/koa-jwt
[license-image]: https://img.shields.io/npm/l/koa-jwt.svg?maxAge=2592000&style=flat-square
[license-url]: https://github.com/koajs/jwt/blob/master/LICENSE

This module lets you authenticate HTTP requests using JSON Web Tokens
in your [Koa](http://koajs.com/) (node.js) applications.

See [this article](http://blog.auth0.com/2014/01/07/angularjs-authentication-with-cookies-vs-token/) (Angular) or [this one](https://medium.com/@leo/why-json-web-tokens-are-truly-awesome-23fb80b7fc20#.w47xi19k1) (Ember) for a good introduction.

 * If you are using `koa` version 2+, and you have a version of node < 7.6, install `koa-jwt@2`.
 * `koa-jwt` version 3+ on the [master](https://github.com/koajs/jwt) branch uses `async` / `await` and hence requires node >= 7.6.<br>
 * If you are using `koa` version 1, you need to install `koa-jwt@1` from npm. This is the code on the [koa-v1](https://github.com/koajs/jwt/tree/koa-v1) branch.


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
 * @return {Promise}     If the token is not revoked, the promise must resolve with false, otherwise (the promise resolve with true or error) the token is revoked
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

If the `secret` option is a function, this function is called for each JWT received in
order to determine which secret is used to verify the JWT.

The signature of this function should be `(header) => [Promise(secret)]`, where
`header` is token header. For instance to support JWKS token header should contain
`alg` and `kid`: algorithm and key id fields respectively.

This option can be used to support JWKS (JSON Web Key Set) providers by using
[node-jwks-rsa](https://github.com/auth0/node-jwks-rsa). For example:
```js
const { koaJwtSecret } = require('jwks-rsa');

app.use(jwt({ secret: koaJwtSecret({
                        jwksUri: 'https://sandrino.auth0.com/.well-known/jwks.json',
                        cache: true,
                        cacheMaxEntries: 5,
                        cacheMaxAge: ms('10h') }),
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
- [sdd](https://github.com/sdd)
- [Jackong](https://github.com/Jackong)
- [danwkennedy](https://github.com/danwkennedy)
- [nfantone](https://github.com/nfantone)
- [scttcper](https://github.com/scttcper)
- [jhnns](https://github.com/jhnns)
- [dunnock](https://github.com/dunnock)


## License

[The MIT License](http://opensource.org/licenses/MIT)
