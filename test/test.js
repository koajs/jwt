'use strict';
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MjY1NDY5MTl9.ETgkTn8BaxIX4YqvUWVFPmum3moNZ7oARZtSBXb_vP4';

const Koa     = require('koa');
const request = require('supertest');
const assert  = require('assert');
const jwt     = require('jsonwebtoken');
const koajwt  = require('../lib');
const expect  = require('chai').expect;

describe('failure tests', () => {

  it('should throw 401 if no authorization header', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('Authentication Error')
      .end(done);
  });

  it('should throw 401 if no authorization header', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh', debug: true }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('Token not found')
      .end(done);
  });

  it('should return 401 if authorization header is malformed', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"')
      .end(done);
  });

  it('should return 401 if authorization header does not start with Bearer', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearskin Jacket')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"')
      .end(done);
  });

  it('should allow provided getToken function to throw', done => {
    const app = new Koa();

    app.use(koajwt({
      secret: 'shhhh',
      getToken: ctx => ctx.throw(401, 'Bad Authorization')
    }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('Bad Authorization')
      .end(done);
  });

  it('should throw if getToken function returns invalid jwt', done => {
    const app = new Koa();

    app.use(koajwt({
      secret: 'shhhhhh',
      getToken: () => jwt.sign({foo: 'bar'}, 'bad'),
      debug: true
    }));
    request(app.listen())
      .get('/')
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });

  it('should throw if authorization header is not well-formatted jwt', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer wrongjwt')
      .expect(401)
      .expect('jwt malformed')
      .end(done);
  });

  it('should throw if authorization header is not valid jwt', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'different-shhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });

  it('should throw if authorization header is not valid jwt according to any secret', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: ['different-shhhh', 'some-other-shhhhh'], debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });

  it('should throw non-descriptive errors when debug is false', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: 'different-shhhh', debug: false }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Authentication Error')
      .end(done);
  });

  it('should throw if opts.cookies is set and the specified cookie is not well-formatted jwt', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, cookie: 'jwt', debug: true }));
    app.use(ctx => { ctx.body = ctx.state.user; });

    request(app.listen())
      .get('/')
      .set('Cookie', 'jwt=bad' + token + ';')
      .expect(401)
      .expect('invalid token')
      .end(done);

  });

  it('should throw if audience is not expected', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', aud: 'expected-audience'}, secret);

    const app = new Koa();
    app.use(koajwt({
      secret: 'shhhhhh',
      audience: 'not-expected-audience',
      debug: true
    }));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('jwt audience invalid. expected: not-expected-audience')
      .end(done);
  });

  it('should throw if token is expired', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', exp: 1382412921 }, secret);

    const app = new Koa();
    app.use(koajwt({ secret: 'shhhhhh', debug: true }));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('jwt expired')
      .end(done);
  });

  it('should throw with original jsonwebtoken error as originalError property', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', exp: 1382412921 }, secret);

    const app = new Koa();
    // Custom 401 handling
    app.use((ctx, next) => {
      return next().catch(err => {
        expect(err).to.have.property('originalError');
        expect(err.originalError.message).to.equal('jwt expired');
        throw err;
      });
    });
    app.use(koajwt({ secret: 'shhhhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('jwt expired')
      .end(done);
  });

  it('should throw if token issuer is wrong', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();
    app.use(koajwt({ secret: 'shhhhhh', issuer: 'http://wrong', debug: true }));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('jwt issuer invalid. expected: http://wrong')
      .end(done);
  });

  it('should throw if secret neither provided by options or middleware', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();
    app.use(koajwt({debug: true}));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Secret not provided')
      .end(done);
  });

  it('should throw if secret both provided by options (right secret) and middleware (wrong secret)', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    const app = new Koa();
    app.use(koajwt({secret: 'wrong secret', debug: true}));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });

  it('should throw 401 if isRevoked throw error', done => {

    const isRevoked = (ctx, token, user) => Promise.reject(new Error('Token revocation check error'));
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, isRevoked, debug: true }));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Token revocation check error')
      .end(done);
  });

  it('should throw 401 if revoked token', done => {

    const isRevoked = (ctx, token, user) => Promise.resolve(true);
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, isRevoked, debug: true }));

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Token revoked')
      .end(done);
  });

  it('should throw if secret provider rejects', done => {

    const secret = 'shhhhhh';
    const provider = ({alg, kid}) => Promise.reject(new Error("Not supported"));
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Not supported')
      .end(done);
  });

  it('should throw if secret provider used but token invalid', done => {

    const secret = 'shhhhhh';
    const provider = ({ alg, kid }) => Promise.resolve('a nice secret');
    const token = jwt.sign({ foo: 'bar' }, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer dodgytoken')
      .expect(401)
      .expect('Invalid token')
      .end(done);
  });

  it('should throw if secret provider returns a secret that does not match jwt', done => {

    const secret = 'shhhhhh';
    const provider = ({alg, kid}) => Promise.resolve("not my secret");
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });

  it('should throw if no secret provider returns a secret that matches jwt', done => {

    const secret = 'shhhhhh';
    const provider = ({alg, kid}) => Promise.resolve(["not my secret", "still not my secret"])
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('invalid signature')
      .end(done);
  });
});

describe('passthrough tests', () => {
  it('should continue if `passthrough` is true', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', passthrough: true, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .expect(204) // No content
      .expect('')
      .end(done);
  });

  it('should continue if `passthrough` is true with bad auth header format', done => {
    const app = new Koa();

    app.use(koajwt({ secret: 'shhhhhh', passthrough: true, debug: true }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'liver and onions')
      .expect(204) // No content
      .expect('')
      .end(done);
  });
});


describe('success tests', () => {

  it('should work if authorization header is valid jwt', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should work if authorization header is valid jwt according to one of the secrets', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: [secret, 'another secret'] }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should work if the provided getToken function returns a valid jwt', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();
    app.use(koajwt({ secret: secret, getToken: ctx => ctx.request.query.token }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/?token=' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should use the first resolved token', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);
    const invalidToken = jwt.sign({foo: 'bar'}, 'badSecret');

    const app = new Koa();

    app.use(koajwt({ secret: secret, cookie: 'jwt'}));
    app.use(ctx => {
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

  it('should work if opts.cookies is set and the specified cookie contains valid jwt', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, cookie: 'jwt' }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Cookie', 'jwt=' + token + ';')
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should use provided key for decoded data', done => {
    const validUserResponse = res => res.body.foo === 'bar' && "Key param not used properly";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }));
    app.use(ctx => {
      ctx.body = ctx.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should work if secret is provided by middleware', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use((ctx, next) => {
        ctx.state.secret = secret;
        return next();
    });
    app.use(koajwt());
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
        .get('/')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .expect(validUserResponse)
        .end(done);
  });

  it('should work if secret is provided by secret provider function', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const provider = ({ alg, kid }) => Promise.resolve(secret);
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should work if a valid secret is provided by one of the secret provider functions', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const provider = ({ alg, kid }) => Promise.resolve(['other-shhhh', secret]);
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: provider }));
    app.use(ctx => {
      ctx.body = ctx.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should not overwrite ctx.state.token on successful token verification if opts.tokenKey is undefined', done => {
    const validUserResponse = res => res.body.token === "DONT_CLOBBER_ME" && "ctx.state.token not clobbered";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use((ctx, next) => {
      ctx.state = { token: 'DONT_CLOBBER_ME' };
      return next();
    });
    app.use(koajwt({ secret: secret, key: 'jwtdata' }));
    app.use(ctx => {
      ctx.body = { token: ctx.state.token };
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should populate the raw token to ctx.state, in key from opts.tokenKey', done => {
    const validUserResponse = res => res.body.token !== token && "Token not passed through";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata', tokenKey: 'testTokenKey' }));
    app.use(ctx => {
      ctx.body = { token: ctx.state.testTokenKey };
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should use middleware secret if both middleware and options provided', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use((ctx, next) => {
      ctx.state.secret = secret;
      return next();
    });
    app.use(koajwt({secret: 'wrong secret'}));
    app.use(ctx => {
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

  it('should pass if the route is excluded', done => {
    const validUserResponse = res => res.body.success === true && "koa-jwt is getting fired.";

    const secret = 'shhhhhh';
    const app = new Koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use(ctx => {
      ctx.body = { success: true };
    });

    request(app.listen())
      .get('/public')
      .set('Authorization', 'wrong')
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should fail if the route is not excluded', done => {
    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use(ctx => {
      ctx.body = { success: true };
    });

    request(app.listen())
      .get('/private')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"')
      .end(done);
  });

  it('should pass if the route is not excluded and the token is present', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Key param not used properly";

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }).unless({ path: ['/public']}));
    app.use(ctx => {
      ctx.body = ctx.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should work if authorization header is valid jwt and is not revoked', done => {
    const validUserResponse = res => res.body.foo !== 'bar' && "Wrong user";

    const isRevoked = (token, ctx, user) => Promise.resolve(false);

    const secret = 'shhhhhh';
    const token = jwt.sign({foo: 'bar'}, secret);

    const app = new Koa();

    app.use(koajwt({ secret: secret, isRevoked }));
    app.use(ctx => {
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
