'use strict';
const Koa = require('koa');
const koajwt = require('../lib');
const jwt = require('jsonwebtoken');

const profile = {
  id: 123
};

const TOKEN = jwt.sign(profile, 'secret', { expiresIn: 60*5 });

console.log('Starting koa-jwt test server on http://localhost:3000/');
console.log('');
console.log('You can test the server by issuing curl commands like the following:');
console.log('');
console.log('  curl http://localhost:3000/public/foo            # should succeed (return "unprotected")');
console.log('  curl http://localhost:3000/api/foo               # should fail (return "401 Unauthorized ...")');
console.log('  curl -H "Authorization: Bearer ' + TOKEN + '" http://localhost:3000/api/foo   # should succeed (return "protected")');
console.log('');

const app = new Koa();

// Custom 401 handling
app.use((ctx, next) => {
  return next().catch(err => {
    if (401 == err.status) {
      ctx.status = 401;
      ctx.body = '401 Unauthorized - Protected resource, use Authorization header to get access\n';
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
app.use(koajwt({ secret: 'secret' }));

app.use(ctx => {
  if (ctx.url.match(/^\/api/)) {
    ctx.body = 'protected\n';
  }
});

app.listen(3000);
