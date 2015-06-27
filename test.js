var request = require('supertest');
var app = require('./app');

describe('Requests to the root path', function() {

  it('Returns a 200 status code', function(done) {
      request(app)
          .get('/')
          .expect(200,done);
  });
  it('Returns a HTML format', function(done) {
      request(app)
          .get('/')
          .expect('Content-Type', /html/, done);
  });

});

describe('Initial server query on /init', function(){
    it('Returns 200 status code', function(done) {
      request(app)
        .get('/init')
        .expect(200,done);
    });
    
    it('Returns json format', function(done) {
      request(app)
        .get('/init')
        .expect('Content-Type', /json/,done);
    });
    it('Returns initial cities', function(done) {
      request(app)
        .get('/init')
        .expect(JSON.stringify({sessionID: 1,numProps: 5}),done);      
    });
    
});

