'use strict';
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MjY1NDY5MTl9.ETgkTn8BaxIX4YqvUWVFPmum3moNZ7oARZtSBXb_vP4';

const Koa     = require('koa');
const request = require('supertest');
const assert  = require('assert');
const jwt     = require('jsonwebtoken');

const koajwt  = require('./index');

describe('failure tests', () => {

  it('should throw 401 if no authorization header', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .expect(401)
      .end(done);
  });

  it('should return 401 if authorization header is malformed', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
      .end(done);
  });

  it('should allow provided getToken function to throw', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh', getToken: (ctx) => {
      ctx.throw(401, 'Bad Authorization\n');
    } }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('Bad Authorization\n')
      .end(done);
  });

  it('should throw if getToken function returns invalid jwt', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', getToken: () => {
      let secret = 'bad';
      return jwt.sign({foo: 'bar'}, secret);
    } }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('Invalid token\n')
      .end(done);
  });

  it('should throw if authorization header is not well-formatted jwt', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer wrongjwt')
      .expect(401)
      .expect('Invalid token\n')
      .end(done);
  });

  it('should throw if authorization header is not valid jwt', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'different-shhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - invalid signature\n')
      .end(done);
      //   assert.equal(err.message, 'invalid signature');
  });

  it('should throw if opts.cookies is set and the specified cookie is not well-formatted jwt', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, cookie: 'jwt' }));
    app.use((ctx, next) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Cookie', 'jwt=bad' + token + ';')
      .expect(401)
      .expect('Invalid token\n')
      .end(done);

  });

  it('should throw if audience is not expected', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', aud: 'expected-audience'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', audience: 'not-expected-audience', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt audience invalid. expected: not-expected-audience\n')
      .end(done);
  });

  it('should throw if token is expired', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', exp: 1382412921 }, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt expired\n')
      .end(done);
  });

  it('should throw if token issuer is wrong', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', issuer: 'http://wrong', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt issuer invalid. expected: http://wrong\n')
      .end(done);
  });

  it('should throw if secret neither provided by options or middleware', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();

    app.use(koajwt({debug: true}));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid secret\n')
      .end(done);
  });

  it('should throw if secret both provided by options (right secret) and middleware (wrong secret)', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();

    app.use(koajwt({secret: 'wrong secret', debug: true}));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - invalid signature\n')
      .end(done);
  });

});

describe('passthrough tests', () => {
  it('should continue if `passthrough` is true', (done) => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', passthrough: true, debug: true }));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .expect(204) // No content
      .expect('')
      .end(done);
  });
});


describe('success tests', () => {

  it('should work if authorization header is valid jwt', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    }

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret }));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should work if the provided getToken function returns a valid jwt', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    }

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();
    app.use(koajwt({ secret: secret, getToken: (ctx) => {
      return ctx.request.query.token;
    }}));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/?token=' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should use the first resolved token', (done) => {
    const validUserResponse = res => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    }

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const invalidToken = jwt.sign({foo: 'bar'}, 'badSecret');

    const app = new Koa();
    app.use(koajwt({ secret: secret, cookie: 'jwt'}));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Cookie', 'jwt=' + token + ';')
      .set('Authorization', 'Bearer ' + invalidToken)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should work if opts.cookies is set and the specified cookie contains valid jwt', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    }

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, cookie: 'jwt' }));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Cookie', 'jwt=' + token + ';')
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should use provided key for decoded data', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Key param not used properly";
    }

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }));
    app.use((ctx) => {
      ctx.body = ctx.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should work if secret is provided by middleware', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    };

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use((ctx, next) => {
        ctx.state.secret = secret;
        return next();
    });
    app.use(koajwt());
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
        .get('/')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .expect(validUserResponse)
        .end(done);
  });


  it('should use middleware secret if both middleware and options provided', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    };

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use((ctx, next) => {
      ctx.state.secret = secret;
      return next();
    });
    app.use(koajwt({secret: 'wrong secret'}));
    app.use((ctx) => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
        .get('/')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .expect(validUserResponse)
        .end(done);
  });
});

describe('unless tests', () => {

  it('should pass if the route is excluded', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.success === true)) return "koa-jwt is getting fired.";
    };

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use((ctx) => {
      ctx.body = { success: true };
    });

    request(app.listen())
      .get('/public')
      .set('Authorization', 'wrong')
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should fail if the route is not excluded', (done) => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use((ctx) => {
      ctx.body = { success: true };
    });

    request(app.listen())
      .get('/private')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
      .end(done);
  });

  it('should pass if the route is not excluded and the token is present', (done) => {
    const validUserResponse = (res) => {
      if (!(res.body.foo === 'bar')) return "Key param not used properly";
    };

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }).unless({ path: ['/public']}));
    app.use((ctx) => {
      ctx.body = ctx.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });
});
