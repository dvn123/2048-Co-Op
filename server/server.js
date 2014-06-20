var io = require("socket.io").listen(8080, { log: false });
var winston = require("winston"); //logger

var logger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: "2048-Co-Op.log" })
    ]
});

var gameManager = require("./server_game_manager.js");
var game = new gameManager(4);

const voteThrottle = 0; //Test Value
//const voteThrottle = 500; //Live Value
const voteCounterInterval = 10000;
const voteCounterDemocracyInterval = 5000;

var currentMode = "anarchy";
var democracyVotes = 0;
var anarchyVotes = 1;
var voteThrottleCounter = {};
var democracyMoveVotes = [0, 0, 0, 0];

var userCount = 0;

var voteCounterRun = setInterval(voteCounter, voteCounterInterval);
var voteCounterDemocracyRun;

io.sockets.on("connection", function (socket) {
    userCount++;
    socket.on("getGameState", function () {
        var game_state = game.getGameState();
        game_state["anarchyVotes"] = anarchyVotes;
        game_state["democracyVotes"] = democracyVotes;
        game_state["currentMode"] = anarchyVotes;
        socket.emit("gameState", game.getGameState());
    });

    socket.on("democracyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            democracyVotes++;
            io.emit("democracyVote", democracyVotes);
            //console.log("Democracy votes: " + democracyVotes);
        }
    });

    socket.on("anarchyVote", function () {
        if(checkVoteThrottle(socket.id)) {
            anarchyVotes++;
            io.emit("anarchyVote", anarchyVotes);
            //console.log("Anarchy votes: " + anarchyVotes);
        }
    });

    socket.on("move", function (direction, grid) {
        if ((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            if (currentMode == "anarchy") {
                emitMove(direction, socket)
            } else {
                democracyMoveVotes[direction]++;
                logger.log("Democracy Move Vote", "Direction - " + direction + "Author - " + socket.id);
            }
        }
    });

    socket.on('disconnect', function() {
        console.log(socket.id + ' disconnected');
        userCount--;
    });
});

function emitMove(direction, socket) {
    console.log("ASD - " + direction);
    var randoms = game.move(direction);
    io.emit("move", direction, randoms);
    if(socket == null) {
        socket = {};
        socket['id'] = "democracy";
    }
    logger.log("Move", "Direction - " + direction + "Author - " + socket.id, game.getGrid());
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
    //console.log("Democracy Votes:" + democracyVotes);
    //console.log("Anarchy Votes:" + anarchyVotes);
    //console.log("New mode: " + currentMode);
    voteThrottleCounter = {};
    io.emit("gameMode", currentMode);
}

function voteCounterDemocracy() {
    var move = -1;
    var max_move_votes_counter = 0;
    for (i = 0; i < democracyMoveVotes.length; i++) {
        if (democracyMoveVotes[i] > max_move_votes_counter && democracyMoveVotes[i] > 0)
            move = i;
    }
    if (move != -1)
        emitMove(move, null);
    //console.log("Democracy Move: " + move);
    democracyMoveVotes = [0, 0, 0, 0];
}
