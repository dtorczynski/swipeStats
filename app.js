var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonencode = bodyParser.json();

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/SWIPE_SECRETS';

app.use(express.static('app'));

// perhaps move all this init param stuff to separate script to only run once.


app.get('/init', function(request,response){
    var params = {sessionID: 1, numProps: 5};
    response.json(params);
});

app.post('/new_proposition', jsonencode, function(request,response){
    response.sendStatus(201);
});

app.post('/prediction', jsonencode, function(request,response){
    response.send('+4 to genius you suave nerd baller you on session: ' + request.body.sessionID);
});

app.post('/new_choice', jsonencode, function(request,response){
    response.sendStatus(201);
});
// when session closes, if fewer than n entries, perhaps delete session



MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  db.close();
});




module.exports = app;

