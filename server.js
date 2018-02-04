'use strict';

var config = require('./config');

var fs = require("fs")
  , express = require("express")
  , app = express()
  , https = require('https')
  , bodyParser = require("body-parser")
  , mysql = require("mysql")
  , logger = require('log4js').getLogger()
  , eventEmitter = require('events').EventEmitter
  , Sequelize = require('sequelize')
  , errorHandler = require('errorhandler')
  , sendmailTransport = require('nodemailer-sendmail-transport')
  , mailTransporter = require('nodemailer').createTransport(sendmailTransport({ path: '/usr/sbin/sendmail' }));

  
function die(str) {
  if (config.environment == "development")
    throw new Error(str || "Script ended by death");
  else
    process.exit(1);
}
      
function isInt(value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};


var exception = "Server up and running!";
var mailOptions = {
      from: config.mail.from,
      to: config.mail.to, // list of receivers
      subject: 'Server Started', // Subject line
      text: exception, // plaintext body
      html: '<pre>' + exception + '</pre>' // html body
    };  
  
mailTransporter.sendMail(mailOptions, function(error, info){
  if(error){
    return console.log(error);
  }
  console.log('Server up message sent: ' + JSON.stringify(error) + "," + JSON.stringify(info)) ;
});

// Message engine between clients
var ee = new eventEmitter;

ee.on('message', function(msg) {
  logger.info("Got message 'message': " + JSON.stringify(msg)); 
});


// Debug - uncaughtException should only use system/process objects and not call any callbacks
process.on('uncaughtException', function (exception) {
    
  if ((exception.code == "EADDRINUSE") && (exception.errno == "EADDRINUSE") && (exception.syscall == "listen")) {
    logger.fatal("Other server may be running on the same port.");
  } else {
    logger.fatal("Uncaught Exception: " + JSON.stringify(exception)); // to see your exception details in the console
    logger.fatal("Trace: " + exception.stack);
  }
  
  process.exit();
});

// SEQUELIZE

var sequelize = new Sequelize(config.database.database, config.database.user, config.database.password, {
  host: config.database.hostname,
  port: config.database.port,
  dialect: 'mysql',
    
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },                    
});

var Session = sequelize.define('session', { 
  id: { type: Sequelize.INTEGER, primaryKey: true },
  title: { type: Sequelize.STRING },
  description: { type: Sequelize.STRING },
  token: { type: Sequelize.STRING },
}, { 
  timestamps: false,
  freezeTableName: true,
  tableName: 'session'
});

var Meeting = sequelize.define('meeting',{
  id: { type: Sequelize.INTEGER, primaryKey:true },
  session_id: {type: Sequelize.INTEGER },
  expert_id: {type: Sequelize.INTEGER },
  meetingState_id: {type: Sequelize.INTEGER },
  token: { type: Sequelize.STRING },
  peerJSId: { type: Sequelize.STRING },
},{
  timestamps: false,
  freezeTableName: true,
  tableName: 'meeting'
});

Session.hasOne(Meeting, {foreignKey: 'session_id'});

Session.find({where:{token:'707e1ebcd5f26c5347c714357061cd7a'}}).then(function(session){
  session.getMeeting().then(function(meeting){ console.log(meeting.token);});
});

var User = sequelize.define('user', { 
  id: { type: Sequelize.INTEGER, primaryKey: true },
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING },
  localuser: { type: Sequelize.STRING },
  authsource: { type: Sequelize.STRING },
  createdAt: { type: Sequelize.DATE },
  lastLogin: { type: Sequelize.DATE },
  sessionCount: { type: Sequelize.INTEGER },
  locale: { type: Sequelize.STRING },
}, { 
  timestamps: false,
  freezeTableName: true,
  tableName: 'user'
});

User.findAll().then(function (users) {
  users.forEach(function(user) {
    console.log(user.dataValues);
  });
});

Session.findAll().then(function (sessions) {
  sessions.forEach(function(session) {
    console.log(session.dataValues);
  });
});

Meeting.findAll().then(function (meetings) {
  meetings.forEach(function(meeting) {
    console.log(meeting.dataValues);
  });
});


// LOGGING LIB

logger.info('Testing logger: info message'); 
logger.warn('Testing logger: warning message'); 
logger.error('Testing logger: error message'); 
logger.fatal('Testing logger: fatal message'); 
logger.debug("Testing logger: debug message");
 
// MYSQL RAW QUERIES

// Config
var database = mysql.createConnection({
  host     : config.database.hostname,
  port     : config.database.port,
  user     : config.database.user,
  password : config.database.password,
  database : config.database.database
});

// Connect
database.connect();

// Query
database.query('SELECT count(*) AS count from user', function(err, rows, fields) {
  if (err) throw err;
  
  console.log('The registered users are: ', rows[0].count);
    
  ee.emit("message", rows[0]);
});

// Close down - add on soft shutdown
database.end();

// APP SERVER

// Server's IP address
app.set("ipaddr", config.serverHostName);

// Server's port number 
app.set("port", config.serverPort);

// Server log on fatal exception
app.use(errorHandler({ dumpExceptions: true, showStack: true })); 

// Tells server add the CORS headers to the responses
app.use(allowCrossDomain);

app.use('/', express.static(__dirname + '/html'));

app.get('/', function(req, res){
  res.send('Server is running...');
});

app.get('/getVersion', function(req, res){  
  res.send({ result : { version: 1 }, error : 0 });
});

app.get('/api/:table', require('./routes/api')({ sequelize: sequelize }).index);
app.get('/api/:table/:id', require('./routes/api')({ sequelize: sequelize }).index);


// app.use('/api', require('./routes')({ app : app, path : '' }).index);

// Tells server to support JSON requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var options = {
    key  : fs.readFileSync(config.httpsKey),
    cert : fs.readFileSync(config.httpsCrt),
    path : config.peerJSPath
  }

var peerOptions = {  
  debug: true,
  allow_discovery: true,
  ssl : options,  
};

var server = https.createServer(options, app);
server.listen(config.serverPort);

var io = require('socket.io')(server);

// Send current time to all connected clients
function sendTime() {
  io.emit('time', { time: new Date().toJSON() });
};

var expressPeerServer = require('peer').ExpressPeerServer(server, peerOptions);


app.use(config.peerJSPath, expressPeerServer);

logger.info("PeerJS Path: " + config.peerJSPath);

expressPeerServer.on('connection', function(id) { 
  console.log("New PEER! " + id); 
});

expressPeerServer.on('disconnect', function(id) {
  console.log("PEER " + id + " disconnected");
});

io.on('connection', function(socket){  

  var registered = { queueChange : 0 };  

  console.log("New socket.io connection!");

  socket.on('getVersion', function(msg){
    console.log("Responding to Version! " + msg);
    socket.emit('version', { version: 1 });
  });

  socket.on('registerPeer', function(msg) {
    console.log("Participant registration: id = " + msg.id 
              + " participantType = " + msg.participantType               
	      + " meeting token = " + msg.meetingToken
	      + " session token = " + msg.sessionToken
            );
    registered.id = msg.id;
    registered.meetingToken = msg.meetingToken;
    registered.participantType = msg.participantType;
    socket.join(msg.sessionToken); 
    socket.join(msg.id);
    socket.user = msg.id;
    socket.session = msg.sessionToken;
    socket.participantType = msg.participatType;
    socket.name = msg.name;
    ee.emit("newPeerRegistered", registered);
  });

  function newPeerRegistered(otherPeer) {
    logger.info(registered.id + " Got message 'newPeerRegistered' from: " + otherPeer.id);
    if (registered.id != otherPeer.id) {
      if (registered.meetingToken == otherPeer.meetingToken) {
        if (registered.participantType == 'expert') {
          socket.emit("NotifyNewParticipantOnQueue", otherPeer);
        }
      }
    }
  }

  socket.on('joinRoom', function(roomId){
    socket.join(roomId);
    for (var i in io.sockets.adapter.rooms[roomId].sockets) {
      if ( io.sockets.connected[i].user === roomId ) { // users private room
        console.log('this is the room of: ',io.sockets.connected[i].name);
        io.in(roomId).emit('chatMessage', {'room':roomId, 'user':io.sockets.connected[i].name, message:''});
      }
    };     
});

  ee.on('newPeerRegistered', newPeerRegistered);
  
  socket.on('registerToQueueChangeEvent', function(msg){
    console.log("registerToQueueChangeEvent! " + msg);
    registered.queueChange = 1;
    
  });
  
  socket.on('unRegisterToQueueChangeEvent', function(msg){
    console.log("unRegisterToQueueChangeEvent! " + msg);
    registered.queueChange = 0;
  });
  
  socket.on('getCurrentQueueInfo', function(msg){
    
    var currentdate = new Date(); 
    var datetime = "Last Sync: " + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
    
    console.log("Responding to getCurrentQueueInfo! " + JSON.stringify(msg));
    socket.emit('currentQueueInfo', { 
      count       : 2,
      time        : datetime,
      queueDetail : [ {id: 1, name : "rui ribeiro", waiting : 4 },
                      {id: 2, name : "daniel ribeiro", waiting : 2 }
                    ],
      html        : "<b>" + datetime + "</b>"
    });
  });

  // Teste client
  // https://jsfiddle.net/o2j9qjps/
  
  socket.on('getRawData', function(msg){
    console.log("Responding to getRawData! " + JSON.stringify(msg));
    
    var mode = msg.mode;
    
    var SQL = "SELECT * FROM ";
    
    if (mode == "count") {
      SQL = "SELECT count(*) as count FROM ";
    }
        
    var table = msg.table;
    var id = msg.id;
    
    SQL = SQL + table;
    if (isInt(id)) {
      SQL = SQL + " WHERE id = " + id;
    } 
    
    sequelize.query(SQL).then(function(rows) {
      var result = { error : false, data : rows[0] };
      socket.emit('rawData', result);
    }).error(function(error) {
      var result = { error : true };
      socket.emit('rawData', result);
    });
    
  });
  
  socket.on('chatMessage',function(msg){
      io.in(msg.room).emit('chatMessage', msg); 
      console.log('chatMessage: ', msg);
  });

  socket.on('disconnect', function(msg){
    ee.removeListener('newPeerRegistered',newPeerRegistered);	
    console.log('Connection closed');
  });

});


server.listen(app.get("port"), app.get("ipaddr"), function() {
  logger.info("Server up and running. Go to https://" + app.get("ipaddr") + ":" + app.get("port"));
  
});  
  
