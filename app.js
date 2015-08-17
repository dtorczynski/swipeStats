var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonencode = bodyParser.json();

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/SWIPE_SECRETS';

app.use(express.static('app'));

// perhaps move all this init param stuff to separate script to only run once.
// Insert test new prop and session docs for init
var testNewProp = {
    "_id": '1', 
    "newPropData": {
       "url": 'www.google.com', 
       "description": 'search engine', 
       "email": 'tor@gmail.com'
    }
};

var insertDocNewProp = function(db,callback) {
    db.collection('new_proposition').insertOne(testNewProp,function(err,result) {
        assert.equal(err,null);
        console.log("Inserted a doc to new_proposition collection.");
        callback(result);
    });
};

MongoClient.connect(url,function(err,db) {
     assert.equal(null,err);
     insertDocNewProp(db, function() {
       db.close();
     });
});

var session1 = {
    "_id": 1,
    "propositions": [1,2],
    "choices": [0,1]
};
var session2 = {
    "_id": 2,
    "propositions": [2,4],
    "choices": [1,1]
};

var insertNewDocInSessions = function(db,data,callback) {
    db.collection('sessions').insertOne(data,function(err,result) {
        assert.equal(err,null);
        console.log("Inserted into collection session");
        callback(result);
    });
};

MongoClient.connect(url,function(err,db) {
     assert.equal(null,err);
     insertNewDocInSessions(db, session1, function() {
       db.close();
     });
});

MongoClient.connect(url,function(err,db) {
     assert.equal(null,err);
     insertNewDocInSessions(db, session2, function() {
       db.close();
     });
});

var metaData = {
    "_id": 1,
    "numProps": 6,
    "numSessions": 0
};


var insertNewMetaData = function(db,callback) {
    db.collection('meta_data').insertOne(metaData,function(err,result) {
        assert.equal(err,null);
        console.log("Inserted a doc to meta_data collection.");
        callback(result);
    });
};

MongoClient.connect(url,function(err,db) {
     assert.equal(null,err);
     insertNewMetaData(db, function() {
       db.close();
     });
});



// Set up routes used by front end
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







module.exports = app;

