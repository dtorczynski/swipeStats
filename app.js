var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonencode = bodyParser.json();

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/SWIPE_SECRETS';

app.use(express.static('app'));

// perhaps move all this init param stuff to separate script to only run once.
// also to clean up, another module just for init
// Clear database on first boot to avoid duplicate entries
MongoClient.connect(url,function(err,db) {
    assert.equal(null,err);
    db.dropDatabase(function(err,result) {
        assert.equal(err,null);
        console.log("Cleared database on initialization");
        db.close(result);
    });
});

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
    "choices": [0,1],
    "indices": [1,4]
};
var session2 = {
    "_id": 2,
    "propositions": [2,4],
    "choices": [1,1],
    "indices": [4,8]
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
    "numSessions": 2
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

// Sorts each matching session into appropriate buckets
var processMatch = function(buckets,currentSession,matchSession) {
    var multiplier = 0;
    currentSession.forEach(function(choice) {
        multiplier = matchSession.indexOf(choice) > -1 ? multiplier+1 : multiplier;
    });
    console.log("Mutiplier for match: " + multiplier);
    
    matchSession.forEach(function(choice) {
        if (currentSession.indexOf(choice) == -1) {
            choiceStr = choice.toString();
            if (choiceStr in buckets) {
                buckets[choiceStr] =  buckets[choiceStr] + multiplier * 1;
            } else {
                buckets[choiceStr] =  multiplier * 1;
            }
        }
    });
};

// Note: Due to Chrome standard operating procedure, calls are made at multiplie
// points in the website load, eg first character for autofill, completing autofill
// and entering on autofill. As such there are multiple calls to the init route, which
// create unused sessions before the final one that is used. Should have some kind of
// job on the server which routinely clears out sessions with no entries. Or find a 
// better way to deal with this problem.

// Set up routes used by front end
app.get('/init', function(request,response){
    MongoClient.connect(url,function(err,db) {
        assert.equal(null,err);
        var cursor = db.collection('meta_data').find({"_id": 1});
        cursor.each(function(err, doc) {
            assert.equal(err, null);
            if (doc !== null) {
                var newNumSessions = doc.numSessions + 1;
                var params = {sessionID: newNumSessions, numProps: doc.numProps};
                response.json(params);
                db.collection('meta_data').updateOne(
                    {"_id": 1},
                    {$set: {"numSessions": newNumSessions}});
                var newSessionData = {
                    "_id": newNumSessions,
                    "propositions": [],
                    "choices": [],
                    "indices": []
                };    
                db.collection('sessions').insertOne(newSessionData,function(err,result) {
                    assert.equal(err,null);
                    console.log("Inserted new session into collection session");
                    db.close();
                });   
            } else {
                
            }
        });
    });
});

app.post('/new_proposition', jsonencode, function(request,response){
    response.sendStatus(201);
});

app.post('/prediction', jsonencode, function(request,response){

    
    // Get set of all choices (vertices in graph)
    // Perform mongodb search on all sessions, grabbing every set that has a
    // match of at least one to the current set.
    // Iterate through every session
    //  - compute multiplier based on number of matches to current set 
    //  - for every set with match, multiply each other non original member by multiplier
    //    and push onto mongodb collection "bucket", with id of vertex, and +1 to current value
    //  - at end return bucket entry with highest number of values
    // On second thought, perhaps don't read/write to database, time costly
    
    var buckets = {}; // using object for prototype, in production should use hash table or redis
    
    MongoClient.connect(url,function(err, db) {
        assert.equal(null,err); 
         
        var choices = db.collection('sessions').find( { "_id": parseInt(request.body.sessionID) } );
        choices.each(function(err,doc) {
            if (doc !== null) {
                console.log("Current session: \n" + JSON.stringify(doc));
                var relatedChoices = db.collection('sessions').find( 
                    {"indices": 
                        { $elemMatch: { $in: doc.indices }}});
      
                relatedChoices.each(function(err,doc2, callback) {
                    
                    if (doc2 !== null) {
                        
                        if (doc._id != doc2._id) {
                            console.log("Matching sessions: \n" + JSON.stringify(doc2));
                            processMatch(buckets, doc.indices, doc2.indices);
                            console.log(buckets);
                        }
                    } else {
                        db.close();
                        console.log(buckets);
                        // hacky way to find max, O(n) time, perhaps can improve with clever storing
                        var max = -Infinity, x, prop = '1';
                        for( x in buckets) {
                            if( buckets[x] > max) {
                                max = buckets[x];
                                prop = x;
                            }
                        }  
                        var propNum = Math.ceil((parseInt(prop)) / 2) ;
                        var choice = parseInt(prop) % 2 == 0 ? 1 : 0;
                        var prediction = {proposition: propNum, choice: choice};
                        response.json(prediction);
                    }
                });
            } else {
            }
        });  
    });    
});

app.post('/new_choice', jsonencode, function(request,response){
    var sessionID = parseInt(request.body.sessionID);
    var choice = parseInt(request.body.choice);
    var propArray = request.body.proposition;
    var propImage = propArray.split('/')[2];
    var propositionID = parseInt(propImage.substr(4,propImage.length-8));
    
    MongoClient.connect(url,function(err,db) {
        assert.equal(null,err);
        db.collection('sessions').updateOne(
            {"_id": sessionID},
            {$push: {"propositions": propositionID}});
 
        db.collection('sessions').updateOne(
            {"_id": sessionID},
            {$push: {"choices": choice}});
        var index = 2 * (propositionID - 1) + 1 + choice;     
        db.collection('sessions').updateOne(
            {"_id": sessionID},
            {$push: {"indices": index}},function(err, results) {
                db.close();
        });
    });    
    
    response.sendStatus(201);
});
// when session closes, if fewer than n entries, perhaps delete session

module.exports = app;


