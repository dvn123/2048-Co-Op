var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var log4js = require('log4js');
app.listen(80);


function handler (req, res) {
  fs.readFile(__dirname + '../index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}



log4js.clearAppenders();
log4js.loadAppender('file');
/*log4js.addAppender(log4js.appenders.file('logs/Moves.log'), 'Move');
log4js.addAppender(log4js.appenders.file('logs/D&A.log'), 'Democracy & Anarchy');
log4js.addAppender(log4js.appenders.file('logs/User.log'), 'User');
log4js.addAppender(log4js.appenders.file('logs/Synchronization.log'), 'Synchronization');*/

var moveLogger = log4js.getLogger('Move');
var daLogger = log4js.getLogger('Democracy & Anarchy');
var userLogger = log4js.getLogger('User');
var syncLogger = log4js.getLogger('Synchronization');

var gameManager = require("./server_game_manager.js");
var game = new gameManager(4);

var gamesWon = 0;
var gamesLost = 0;

const voteThrottle = 0; //Test Value
//const voteThrottle = 500; //Live Value
const voteCounterInterval = 10000;
const voteCounterDemocracyInterval = 5000;

var currentMode = "Anarchy";
var democracyVotes = 0;
var anarchyVotes = 1;
var voteThrottleCounter = {};
var democracyMoveVotes = [0, 0, 0, 0];
// 0: up, 1: right, 2: down, 3: left

var userCount = 0;

var voteCounterRun = setInterval(voteCounter, voteCounterInterval);
var voteCounterDemocracyRun;

moveLogger.debug('New Instance \n-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');

io.sockets.on("connection", function (socket) {
    userCount++;
    userLogger.debug('Connect - UserCount:' + userCount + ', Author: ' + socket.id);
    socket.on("getGameState", function () {
        sendGameState(socket);
    });

    socket.on("nickname", function (name) {
        socket.set("nickname", name);
        userLogger.debug('Nickname - Name:' + name + ', Author: ' + socket.id);
    });

    socket.on("democracyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            democracyVotes++;
            io.emit("democracyVote", democracyVotes);
            daLogger.debug('Vote - DemocracyVotes:' + democracyVotes + ', Author: ' + socket.id);
        } else {
            daLogger.debug('VoteRejected - Author: ' + socket.id);
        }
    });

    socket.on("anarchyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            anarchyVotes++;
            io.emit("anarchyVote", anarchyVotes);
            daLogger.debug('Vote - AnarchyVotes:' + anarchyVotes + ', Author: ' + socket.id);
        } else {
            daLogger.debug('VoteRejected - Author: ' + socket.id);
        }
    });

    socket.on("move", function (direction, grid) {
        if ((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            if (currentMode == "Anarchy") {
                emitMove(direction, socket)
            } else {
                democracyMoveVotes[direction]++;
                io.emit("democracyMoveVote", democracyMoveVotes[0], democracyMoveVotes[1], democracyMoveVotes[2], democracyMoveVotes[3]);
                daLogger.debug('MoveVote - Direction:' + direction + ', Author: ' + socket.id);
            }
        } else {
            moveLogger.debug('MoveRejected  + \nClientGrid: ' + JSON.stringify(grid) + '\nServerGrid: ' + JSON.stringify(game.getGrid()) + ', Author: ' + socket.id);
        }
    });

    socket.on('disconnect', function() {
        userCount--;
        userLogger.debug('Disconnect - UserCount:' + userCount + ', Author: ' + socket.id);
    });
});

function sendGameState(socket) {
    var game_state = game.getGameState();
    game_state["anarchyVotes"] = anarchyVotes;
    game_state["democracyVotes"] = democracyVotes;
    game_state["currentMode"] = currentMode;
    game_state["gamesLost"] = gamesLost;
    game_state["gamesWon"] = gamesWon;
    if(socket != null) {
        socket.emit("gameState", game_state, false);
        syncLogger.debug('SentGameState - GameState:' + JSON.stringify(game_state) + ', Author: ' + socket.id);
    }
    else {
        io.emit("gameState", game_state, true);
        syncLogger.debug('SentGameState - GameState:' + JSON.stringify(game_state) + ', Author: server');
    }
}

function emitMove(direction, socket) {
    var randoms = game.move(direction);
    if(socket == null) {
        socket = {};
        socket['id'] = "democracy";
    }

    if(randoms == undefined)
        randoms = null;

    if(socket.nickname == undefined) {
        name = "User";
        if(socket['id'] == "democracy")
            name = "democracy;"
    } else var name = socket.nickname;

    io.emit("move", direction, randoms, name);

    if(randoms == null)
        moveLogger.debug('Direction:' + direction + ', Random: Null, Author: ' + socket.id);
    else moveLogger.debug('Direction:' + direction + ', RandomCell: ' + randoms.cell + ', RandomValue: ' + randoms.value + ', Author: ' + socket.id);

    if(randoms["over"]) {
        gamesLost++;
        game.setup();
        sendGameState(null);
    } else if(randoms["won"]) {
        gamesWon++;
        game.setup();
        sendGameState(null);
    }
}

function checkVoteThrottle(socketId) {
    var d = new Date();
    if (voteThrottleCounter[socketId] != undefined) {
        var tmp = voteThrottleCounter[socketId];
        voteThrottleCounter[socketId] = d.getTime();
        return tmp + voteThrottle < d.getTime();
    } else {
        voteThrottleCounter[socketId] = d.getTime();
        return true;
    }
}


function voteCounter() {
    if (democracyVotes > anarchyVotes) {
        currentMode = "Democracy";
        voteCounterDemocracyRun = setInterval(voteCounterDemocracy, voteCounterDemocracyInterval);
    } else {
        currentMode = "Anarchy";
        clearInterval(voteCounterDemocracyRun);
    }
    daLogger.debug('NewMode - Mode:' + currentMode + ', AnarchyVotes: ' + anarchyVotes + ', democracyVotes' + democracyVotes);
    voteThrottleCounter = {};
    io.emit("gameMode", currentMode);
}

function voteCounterDemocracy() {
    var move = -1;
    var max_move_votes_counter = 0;
    for (i = 0; i < democracyMoveVotes.length; i++) {
        if (democracyMoveVotes[i] > max_move_votes_counter && democracyMoveVotes[i] > 0) {
            move = i;
            max_move_votes_counter = democracyMoveVotes[i];
        }
    }
    if (move != -1)
        emitMove(move, null);
    democracyMoveVotes = [0, 0, 0, 0];
}
