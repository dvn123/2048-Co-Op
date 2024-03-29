var express = require('express');
var app = express();
app.use(express.static(__dirname + '/public'));
var expressServer = app.listen(process.env.PORT || 8080
);

var io = require('socket.io')(expressServer);

var gameManager = require("./server/server_game_manager.js");
var game = new gameManager(4);

var gamesWon = 0;
var gamesLost = 0;

//const voteThrottle = 0; //Test Value
const voteThrottle = 500; //Live Value
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

io.sockets.on("connection", function (socket) {
    userCount++;
    console.log("asd");
    socket.on("getGameState", function () {
        sendGameState(socket);
    });

    socket.on("nickname", function (name) {
        socket.set("nickname", name);
    });

    socket.on("democracyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            democracyVotes++;
            io.emit("democracyVote", democracyVotes);
        } else {
        }
    });

    socket.on("anarchyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            anarchyVotes++;
            io.emit("anarchyVote", anarchyVotes);
        } else {
        }
    });

    socket.on("move", function (direction, grid) {
        if ((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            if (currentMode == "Anarchy") {
                emitMove(direction, socket)
            } else {
                democracyMoveVotes[direction]++;
                io.emit("democracyMoveVote", democracyMoveVotes[0], democracyMoveVotes[1], democracyMoveVotes[2], democracyMoveVotes[3]);
            }
        } else {
        }
    });

    socket.on('disconnect', function() {
        userCount--;
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
    }
    else {
        io.emit("gameState", game_state, true);
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

    /*if(randoms == null)
        moveLogger.debug('Direction:' + direction + ', Random: Null, Author: ' + socket.id);
    else moveLogger.debug('Direction:' + direction + ', RandomCell: ' + randoms.cell + ', RandomValue: ' + randoms.value + ', Author: ' + socket.id);*/

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
