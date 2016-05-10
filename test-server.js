var Koa = require('koa');
var koajwt = require('./index');
var co = require('co');

var profile = {
  id: 123
};

var token = koajwt.sign(profile, 'secret', {expiresIn: 60 * 5 * 60});

console.log('Starting koa-jwt test server on http://localhost:3000/');
console.log('');
console.log('You can test the server by issuing curl commands like the following:');
console.log('')
console.log('  curl http://localhost:3000/public/foo            # should succeed (return "unprotected")');
console.log('  curl http://localhost:3000/api/foo               # should fail (return "401 Unauthorized ...")');
console.log('  curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/foo   # should succeed (return "protected")');
console.log('')

var app = new Koa();

// Custom 401 handling
app.use(co.wrap(function *(ctx, next) {
  try {
    yield next();
  } catch (err) {
    console.error(err);
    if (401 == err.status) {
      ctx.status = 401;
      ctx.body = '401 Unauthorized - Protected resource, use Authorization header to get access';
    } else {
      throw err;
    }
  }
}));

// Unprotected middleware
app.use((ctx, next)=> {
  if (ctx.url.match(/^\/public/)) {
    ctx.body = 'unprotected';
  } else {
    return next();
  }
});

// Middleware below this line is only reached if JWT token is valid
app.use(koajwt({secret: 'secret'}));

app.use((ctx)=> {
  if (ctx.url.match(/^\/api/)) {
    ctx.body = 'protected';
  }
});

app.on('error', (err, ctx) => {
  console.log(err);
});

app.listen(3000);
