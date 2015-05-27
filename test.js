var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MjY1NDY5MTl9.ETgkTn8BaxIX4YqvUWVFPmum3moNZ7oARZtSBXb_vP4';

var koa     = require('koa');
var request = require('supertest');
var assert  = require('assert');

var koajwt  = require('./index');

describe('failure tests', function () {

  it('should throw if options not sent', function() {
    try {
      koajwt();
    }
    catch(e) {
      assert.ok(e);
      assert.equal(e.message, '"secret" option is required');
    }
  });

  it('should throw 401 if no authorization header', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .expect(401)
      .end(done);
  });

  it('should return 401 if authorization header is malformed', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
      .end(done);
  });

  it('should throw if authorization header is not well-formatted jwt', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer wrongjwt')
      .expect(401)
      .expect('Invalid token\n')
      .end(done);
  });

  it('should throw if authorization header is not valid jwt', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: 'different-shhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - invalid signature\n')
      .end(done);
      //   assert.equal(err.message, 'invalid signature');
  });

  it('should throw if audience is not expected', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar', aud: 'expected-audience'}, secret);

    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', audience: 'not-expected-audience', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt audience invalid. expected: not-expected-audience\n')
      .end(done);
  });

  it('should throw if token is expired', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar', exp: 1382412921 }, secret);

    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt expired\n')
      .end(done);
  });

  it('should throw if token issuer is wrong', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar', iss: 'http://foo' }, secret);

    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', issuer: 'http://wrong', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .expect('Invalid token - jwt issuer invalid. expected: http://wrong\n')
      .end(done);
  });


});

describe('passthrough tests', function () {
  it('should continue if `passthrough` is true', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', passthrough: true, debug: true }));
    app.use(function* (next) {
      this.body = this.state.user;
    });

    request(app.listen())
      .get('/')
      .expect(204) // No content
      .expect('')
      .end(done);
  });
});


describe('success tests', function () {

  it('should work if authorization header is valid jwt', function(done) {
    var validUserResponse = function(res) {
      if (!(res.body.foo === 'bar')) return "Wrong user";
    }

    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret }));
    app.use(function* (next) {
      this.body = this.state.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

  it('should use provided key for decoded data', function(done) {
    var validUserResponse = function(res) {
      if (!(res.body.foo === 'bar')) return "Key param not used properly";
    }

    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }));
    app.use(function* (next) {
      this.body = this.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

});

describe('unless tests', function () {

  it('should pass if the route is excluded', function(done) {
    var validUserResponse = function(res) {
      if (!(res.body.success === true)) return "koa-jwt is getting fired.";
    };

    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use(function* (next) {
      this.body = { success: true };
    });

    request(app.listen())
      .get('/public')
      .set('Authorization', 'wrong')
      .expect(200)
      .expect(validUserResponse)
      .end(done);
  });

  it('should fail if the route is not excluded', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use(function* (next) {
      this.body = { success: true };
    });

    request(app.listen())
      .get('/private')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
      .end(done);
  });

  it('should pass if the route is not excluded and the token is present', function(done) {
    var validUserResponse = function(res) {
      if (!(res.body.foo === 'bar')) return "Key param not used properly";
    };

    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }).unless({ path: ['/public']}));
    app.use(function* (next) {
      this.body = this.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

});