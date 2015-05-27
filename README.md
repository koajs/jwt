# koa-jwt

Koa middleware that validates JSON Web Tokens and sets `ctx.state.user`
(by default) if a valid token is provided.

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
token.  If the token is valid, `ctx.state.user` (by default) will be set
with the JSON object decoded to be used by later middleware for
authorization and access control.


## Example

```js
var koa = require('koa');
var jwt = require('koa-jwt');

var app = koa();

// Custom 401 handling if you don't want to expose koa-jwt errors to users
app.use(function *(next){
  try {
    yield next;
  } catch (err) {
    if (401 == err.status) {
      this.status = 401;
      this.body = 'Protected resource, use Authorization header to get access\n';
    } else {
      throw err;
    }
  }
});

// Unprotected middleware
app.use(function *(next){
  if (this.url.match(/^\/public/)) {
    this.body = 'unprotected\n';
  } else {
    yield next;
  }
});

// Middleware below this line is only reached if JWT token is valid
app.use(jwt({ secret: 'shared-secret' }));

// Protected middleware
app.use(function *(){
  if (this.url.match(/^\/api/)) {
    this.body = 'protected\n';
  }
});

app.listen(3000);
```


Alternatively you can conditionally run the `jwt` middleware under certain conditions:

```js
var koa = require('koa');
var jwt = require('koa-jwt');

var app = koa();

// Middleware below this line is only reached if JWT token is valid
// unless the URL starts with '/public'
app.use(jwt({ secret: 'shared-secret' }).unless({ path: [/^\/public/] }));

// Unprotected middleware
app.use(function *(next){
  if (this.url.match(/^\/public/)) {
    this.body = 'unprotected\n';
  } else {
    yield next;
  }
});

// Protected middleware
app.use(function *(){
  if (this.url.match(/^\/api/)) {
    this.body = 'protected\n';
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
var publicKey = fs.readFileSync('/path/to/public.pub');
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
- [soygul] (https://github.com/soygul)
- [tunnckoCore] (https://github.com/tunnckoCore)
- [getuliojr] (https://github.com/getuliojr)
- [cesarandreu] (https://github.com/cesarandreu)
- [michaelwestphal] (https://github.com/michaelwestphal)

## License

[The MIT License](http://opensource.org/licenses/MIT)
