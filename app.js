/*   
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

var customRules = {};
const 
  bodyParser = require('body-parser'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request'),
  mongoose = require('mongoose');
var fs = require('fs');

const _ = require('lodash');
const   scriptRules = require('./script.json');


var previousMessageHash = {};
var senderContext = {};
var isStopped = false;

// Connect to the database
mongoose.connect('mongodb://admin:admin@ds117821.mlab.com:17821/negm')



// create the schema for the usersID
var usersSchema = new mongoose.Schema({
  user : String,
  usersID :[]
});


var users = mongoose.model('users',usersSchema);


// our follow match database handling
var followSchema = new mongoose.Schema({
  teamId : Number,
  teamFollowers : [],
  spec: String,
  flag : Number
})

var matchFollow = mongoose.model('matchFollow',followSchema);


// Create a schema
var dailyMSchema = new mongoose.Schema({
  spec : String,
  mtime : String,
  uri:String,
  
});

// create a model 
var matchSave = mongoose.model('matchSave',dailyMSchema);

// Create a schema
var userSchema = new mongoose.Schema({
  uname : String,
  uid: Number
});

var userName = mongoose.model('userName',userSchema);

// create the schema for the userFavTeam
var favTeamSchem = new mongoose.Schema({
  teamName : String,
  teamFans :[]
});

// create the model 
var favTeam = mongoose.model('favTeam',favTeamSchem);


function sendOnTime() {
    (function loop() {
        var now = new Date();

        if (now.getHours() === 7 && now.getMinutes() === 0) {
            console.log('morning');

            matchSave.find({mtime:'morning'},function(err,data){
              if(err) throw err; 
              var path = data[0].uri
              var stream = userName.find().stream();

              stream.on('data', function (doc) {
                sendImageMessage(doc.uid,path);
              }).on('error', function (err) {
                // handle the error
              }).on('close', function () {
                // the stream is closed
              });

            //   userName.find({},function(err,data){

            //   if(err) throw err;
            //   data[0].uid.forEach(function(item){
            //     sendImageMessage(item,path);
            //   });
            // });
            });
            
        } else if (now.getHours() === 22 && now.getMinutes() === 0) {
          console.log('midnight');
            matchSave.find({mtime:'midnight'},function(err,data){
              if(err) throw err; 
              var path = data[0].uri
              var stream = userName.find().stream();

              stream.on('data', function (doc) {
                sendImageMessage(doc.uid,path);
              }).on('error', function (err) {
                // handle the error
              }).on('close', function () {
                // the stream is closed
              });
            });
        }
        now = new Date();                  // allow for time passing
        var delay = 60000 - (now % 60000); // exact ms to next minute interval
        setTimeout(loop, delay);
    })();
}

sendOnTime();

//save match id
// var saveMatchFollowers = matchFollow({teamId:4,teamFollowers:[]}).save(function(err){
//   if (err) throw err ;
//   console.log('username saved');
// });




// get the ids from the db
// matchFollow.find({teamId:0},function(err,data){
//   if(err) throw err;
//   console.log(data[0].teamFollowers);
//   data[0].teamFollowers.forEach(function(item){
//     console.log(item)
//   });
//   });



var app = express();

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables 
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.APP_SECRET ;

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.VERIFICATION_TOKEN;

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {

  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature with app secret:" + APP_SECRET);
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature: " + APP_SECRET);
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  if(isStopped == true)
  {
    return;
  }
  var data = req.body;
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

var firstName = "undefined";
var lastName = "undefined"; 

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
      callGetLocaleAPI(event, handleReceivedMessage);
}

function handleReceivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;


  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
//    console.log("Quick reply for message %s with payload %s",
 //     messageId, quickReplyPayload);

    messageText = quickReplyPayload;
    sendCustomMessage(senderID,messageText);
    return;
  }

  if (messageText) {
    if((isStopped == true) && (messageText !== "start")){
      return;
    }
  console.log("Received message for user %d and page %d at %d with message: %s", 
    senderID, recipientID, timeOfMessage,messageText);

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    if (senderID == 1016137398486466 ){
      function isNumber(obj) { return !isNaN(parseFloat(obj)) }
      var type = isNumber(messageText.toLowerCase());
      var numberedMsg = Number(messageText.toLowerCase());
      if ( type ) {
        // update the flag
        matchFollow.update({spec:"mflag"}, { $set: { flag: numberedMsg }},function(err,data){
          if(err) throw err;
          console.log('item updated')
        });
      } else {
        matchFollow.find({spec:'mflag'},function(err,data){
          matchFollow.find({teamId:data[0].flag},function(err,data){
            if(err) throw err;
            //console.log(data[0].teamFollowers);
            data[0].teamFollowers.forEach(function(item){
              sendLiveData(item,messageText);
            });
          }); 
        }); 
      }
    }



    switch (messageText.toLowerCase()) {
      

      case 'hello':
        sendLiveData(senderID, "Hello dear");
        break;

      case 'match1':
        sendSingleJsonMessage(senderID,"MATCH1.json");
        break;

      case 'match2':
        sendSingleJsonMessage(senderID,"MATCH2.json");
        break;


      case 'match':
        sendGenericMessage(senderID);
        break;


      case 'quick reply':
        sendQuickReply(senderID);
        break        


      case 'add menu':
        addPersistentMenu();
        break        

      case 'remove menu':
        removePersistentMenu();
        break        

      

      default:
         sendEnteredMessage(senderID);

    }
  }else if (messageAttachments) {

    var cb = function () {
  console.log("Downloaded: ", messageAttachments[0].payload.url);
  }

  var download = function(url, dest, cb) {
      var file = fs.createWriteStream(dest);
      var request = https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close(cb);
        });
      });
    }

  download(messageAttachments[0].payload.url, "./script/MATCH1.json", cb);


    sendFileMessage(senderID, messageAttachments[0].payload.url);
  } 
}




/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */

function receivedDeliveryConfirmation(event) {
  if(isStopped == true)
  {
    return;
  }
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */

function receivedPostback(event) {
  if(isStopped == true)
  {
    return;
  }
  callGetLocaleAPI(event, handleReceivedPostback);
}

function handleReceivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);


  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.6/" + senderID,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, function(error, response, body) {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        var name = bodyObj.first_name;
        var greeting =   "اهلا يا نجم" + "\n" + name;
        
      }
      sendLiveData(senderID, greeting);
      users.update({user: "user" }, { $push: { usersID: senderID }},function(err,data){
        if(err) throw err;
        console.log('ID added to database')
        });
    });
  }else{
    // When a postback is called, we'll send a message back to the sender to 
    // let them know it was successful
    sendCustomMessage(senderID,payload);
  }
  
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */

function receivedMessageRead(event) {
  if(isStopped == true)
  {
    return;
  }
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}


function sendFileMessage(recipientId, webUrl) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: webUrl
        }
      }
    }
  };

  callSendAPI(messageData);
}


/*
 * Send an image using the Send API.
 *
 */

function sendImageMessage(recipientId, path) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: path
        }
      }
    }
  };

  callSendAPI(messageData);
}


/*
 * Send a video using the Send API.
 *
 */


function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: "https://www.youtube.com/watch?v=Le2Vo9buTPU"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendSingleJsonMessage(recipientId,filename) {
   try {
      filename = "./script/" + filename;
      var json  = require(filename);
      var fullMessage = { recipient: { id: recipientId  }};
      fullMessage.message = json;
      callSendAPI(fullMessage);
   }
   catch (e)
   {
      console.log("error in sendSingleJsonMessage " + e.message + " " + filename + " " + fullMessage);
   }
}

/* 
   Special handling for message that the sender typed in 
*/

function sendEnteredMessage(recipientId) {
  var messageText = "عذرا لم افهم طلبك , من فضلك اختار من القائمه " ;
  sendTextMessage(recipientId, messageText);
}



function sendCustomMessage(recipientId,messageText) {

console.log("sendCustoMessage "+ messageText);

    switch (messageText.toLowerCase()) {

      case 'match':
        sendSingleJsonMessage(recipientId,"MATCH.json");
        break        

      case 'home':
        sendGenericMessage(recipientId);
        break

      case 'clubs':
        sendSingleJsonMessage(recipientId,"CLUBS.json");
        break



      case 'egypt':
        sendSingleJsonMessage(recipientId,"EGYPT.json");
        break
      
      case 'saudi':
        sendSingleJsonMessage(recipientId,"SAUDI.json");
        break

      case 'england':
        sendSingleJsonMessage(recipientId,"ENGLAND.json");
        break

      case 'spain':
        sendSingleJsonMessage(recipientId,"SPAIN.json");
        break

      case 'germany':
        sendSingleJsonMessage(recipientId,"GERMANY.json");
        break

      case 'italy':
        sendSingleJsonMessage(recipientId,"ITALY.json");
        break

      case 'france':
        sendSingleJsonMessage(recipientId,"FRANCE.json");
        break




      case 'follow':
        // sendSingleJsonMessage(recipientId,"MATCH.json");
        // append the id to the list 
        matchFollow.update({teamId: 0 }, { $push: { teamFollowers: recipientId }},function(err,data){
            if(err) throw err;
            console.log('pushed ' + recipientId + "to database of teamId0")
            });    

        break




      default:
         followTeam(recipientId,messageText);
         sendSingleJsonMessage(recipientId,"CHOOSE.json");


    }
    previousMessageHash[recipientId] = messageText.toLowerCase();
}


function followTeam(recipientId,messageText) {
  console.log("user followed a team" + messageText);
  // save the teams
  favTeam.update({teamName: messageText }, { $push: { teamFans: recipientId }},function(err,data){
    if(err) throw err;
    console.log('team fan added to database')
    } );

 } 


function sendJsonMessage(recipientId,keyword) {
  console.log("sendJsonMessage " + keyword);
  if (_.has(scriptRules, keyword.toUpperCase())) {
      sendSingleJsonMessage(recipientId,scriptRules[keyword.toUpperCase()]);
  }
  else if (_.has(customRules, keyword.toUpperCase())) {
      sendSingleJsonMessage(recipientId,customRules[keyword.toUpperCase()]);
  }
  else  {
      sendSingleJsonMessage(recipientId,"HOME.json");
  }
}

function sendLiveData(recipientId, messageText){
  var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText,
       
      }
    };

  callSendAPI(messageData);
}




/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText,
        quick_replies: [
          {
            "content_type":"text",
            "title":"مباريات اليوم ",
            "payload":"match"
          },
          {
            "content_type":"text",
            "title":"الرئيسية",
            "payload":"home"
          },
          {
            "content_type":"text",
            "title":"تابع فريق",
            "payload":"clubs"
          }
        ]
      }
    };

  callSendAPI(messageData);
}



/*
 * Send the user information back, the bot grabs this for every message
 *
 */
function sendLocale(recipientId) {

  var nameString = firstName + " " + lastName;

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: nameString,
      quick_replies: [
        {
          "content_type":"text",
          "title":"Home",
          "payload":"home"
        }
      ]
    }
  };

  callSendAPI(messageData);
}


function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: 
    {
      "attachment": {
        "type": "template",
        "payload": {
         "template_type": "generic",
          "elements": [
          {
            "title": "النجم سبورت",
            "subtitle": "صاحبك بتاع الكورة يا نجم :*",
            "item_url": "https://www.youtube.com/channel/UC8ki89XEZR4BLbEXJZ4olhQ",               
            "image_url": "https://scontent-cai1-1.xx.fbcdn.net/v/t34.0-12/18518861_1667676373261716_1489762969_n.gif?oh=ca9f4c37e93cf97b22182b4fb6c89e0c&oe=591BA032",
          }
          
          ]
        }
      }
    }
  };  

  callSendAPI(messageData);
}



/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Unable to send message. :" + response.error);
    }
  });  
}


function callGetLocaleAPI(event, handleReceived) {
    var userID = event.sender.id;
    var http = require('https');
    var path = '/v2.6/' + userID +'?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + PAGE_ACCESS_TOKEN;
    var options = {
      host: 'graph.facebook.com',
      path: path
    };
    
    if(senderContext[userID])
    {
       firstName = senderContext[userID].firstName; 
       lastName = senderContext[userID].lastName; 
       console.log("found " + JSON.stringify(senderContext[userID]));
       if(!firstName) 
          firstName = "undefined";
       if(!lastName) 
          lastName = "undefined";
       handleReceived(event);
       return;
    }

    var req = http.get(options, function(res) {
      //console.log('STATUS: ' + res.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(res.headers));

      // Buffer the body entirely for processing as a whole.
      var bodyChunks = [];
      res.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        var bodyObject = JSON.parse(body);
        firstName = bodyObject.first_name;
        lastName = bodyObject.last_name;
        if(!firstName) 
          firstName = "undefined";
        if(!lastName) 
          lastName = "undefined";
        senderContext[userID] = {};
        senderContext[userID].firstName = firstName;
        senderContext[userID].lastName = lastName;
        console.log("defined " + JSON.stringify(senderContext));
        handleReceived(event);
      })
    });
    req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    });
}




function addPersistentMenu(){
 request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json:{
        setting_type : "call_to_actions",
        thread_state : "existing_thread",
        call_to_actions:[
            {
              type:"postback",
              title:"Home",
              payload:"home"
            },
            {
              type:"postback",
              title:"Joke",
              payload:"joke"
            },
            {
              type:"web_url",
              title:"DMS Software Website",
              url:"http://www.dynamic-memory.com/"
            }
          ]
    }

}, function(error, response, body) {
    console.log(response)
    if (error) {
        console.log('Error sending messages: ', error)
    } else if (response.body.error) {
        console.log('Error: ', response.body.error)
    }
})

}

function removePersistentMenu(){
 request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json:{
        setting_type : "call_to_actions",
        thread_state : "existing_thread",
        call_to_actions:[ ]
    }

}, function(error, response, body) {
    console.log(response)
    if (error) {
        console.log('Error sending messages: ', error)
    } else if (response.body.error) {
        console.log('Error: ', response.body.error)
    }
})
}


// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

