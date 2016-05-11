# koa-jwt

Koa middleware that validates JSON Web Tokens and sets `ctx.state.user`
(by default) if a valid token is provided.

This module lets you authenticate HTTP requests using JSON Web Tokens
in your [Koa](http://koajs.com/) (node.js) applications.

See [this article](http://blog.auth0.com/2014/01/07/angularjs-authentication-with-cookies-vs-token/)
for a good introduction.

## Install

```
$ npm install koa-jwt@koa2
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


## Example

```js
const Koa = require('koa');
const jwt = require('koa-jwt');

const app = new Koa();

// Custom 401 handling if you don't want to expose koa-jwt errors to users
app.use((ctx, next) => {
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
app.use((ctx, next) => {
  if (ctx.url.match(/^\/public/)) {
    ctx.body = 'unprotected\n';
  } else {
    return next();
  }
});

// Middleware below this line is only reached if JWT token is valid
app.use(jwt({ secret: 'shared-secret' }));

// Protected middleware
app.use((ctx) => {
  if (ctx.url.match(/^\/api/)) {
    ctx.body = 'protected\n';
  }
});

app.listen(3000);
```


Alternatively you can conditionally run the `jwt` middleware under certain conditions:

```js
const koa = require('koa');
const jwt = require('koa-jwt');

const app = new Koa();

// Middleware below this line is only reached if JWT token is valid
// unless the URL starts with '/public'
app.use(jwt({ secret: 'shared-secret' }).unless({ path: [/^\/public/] }));

// Unprotected middleware
app.use((ctx, next) => {
  if (ctx.url.match(/^\/public/)) {
    ctx.body = 'unprotected\n';
  } else {
    return next();
  }
});

// Protected middleware
app.use((ctx) => {
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


This module also support tokens signed with public/private key pairs. Instead
of a secret, you can specify a Buffer with the public key:

```js
const publicKey = fs.readFileSync('/path/to/public.pub');
app.use(jwt({ secret: publicKey }));
```

## Related Modules

- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — JSON Web Token signing
and verification

Note that koa-jwt exports the `sign`, `verify` and `decode` functions from the above module as a convenience.

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
- [Yu Qi](https://github.com/iyuq)

## License

[The MIT License](http://opensource.org/licenses/MIT)
