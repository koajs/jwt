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
      .expect('Bad Authorization header format. Format is "Authorization: ApplePass <token>"\n')
      .end(done);
  });

  it('should throw if authorization header is not well-formatted jwt', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhh' }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'ApplePass wrongjwt')
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
      .set('Authorization', 'ApplePass ' + token)
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
      .set('Authorization', 'ApplePass ' + token)
      .expect(401)
      .expect('Invalid token - jwt audience invalid. expected: expected-audience\n')
      .end(done);
  });

  it('should throw if token is expired', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar', exp: 1382412921 }, secret);

    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', debug: true }));
    request(app.listen())
      .get('/')
      .set('Authorization', 'ApplePass ' + token)
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
      .set('Authorization', 'ApplePass ' + token)
      .expect(401)
      .expect('Invalid token - jwt issuer invalid. expected: http://foo\n')
      .end(done);
  });


});

describe('passthrough tests', function () {
  it('should continue if `passthrough` is true', function(done) {
    var app = koa();

    app.use(koajwt({ secret: 'shhhhhh', passthrough: true, debug: true }));
    app.use(function* (next) {
      this.body = this.user;
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
      this.body = this.user;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'ApplePass ' + token)
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
      this.body = this.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'ApplePass ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

});
