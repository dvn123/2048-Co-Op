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

var currentGameMode = "anarchy";
var democracyVotes = 0;
var anarchyVotes = 1;
const voteThrottle = 500;
var voteThrottleCounter;
var democracyMoveVotes = [0, 0, 0, 0];

var userCount = 0;

io.on("connection", function (socket) {
    userCount++;
    socket.on("getGameState", function () {
        var game_state = game.getGameState();
        game_state["anarchyVotes"] = anarchyVotes;
        game_state["democracyVotes"] = democracyVotes;
        game_state["currentMode"] = anarchyVotes;
        socket.emit("gameState", game.getGameState());
    });

    socket.on("democracyVote", function () {
        if(checkVoteThrottle(socket))
            io.emit("democracyVote", ++democracyVotes);
    });

    socket.on("anarchyVote", function () {
        if(checkVoteThrottle(socket))
            io.emit("anarchyVote", ++anarchyVotes);
    });

    socket.on("move", function (direction, grid) {
        if ((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            if (currentGameMode == "anarchy") {
                emitMove(socket, direction)
            } else {
                democracyMoveVotes[direction]++;
                logger.log("Democracy Move Vote", "Direction - " + direction + "Author - " + socket.id);
            }
        }
    });
});

function emitMove(socket, direction) {
    var randoms = game.move(direction);
    io.emit("move", direction, randoms);
    if(socket == null)
        socket['id'] = "democracy";
    logger.log("Move", "Direction - " + direction + "Author - " + socket.id, game.getGrid());
}

function checkVoteThrottle(socket) {
    var d = new Date();
    if (voteThrottleCounter[socket.id] != null) {
        voteThrottleCounter[socket.id] = d.getTime();
        return voteThrottleCounter[socket.id] + voteThrottle < d.getTime();
    } else {
        voteThrottleCounter[socket.id] = d.getTime();
        return true;
    }
}

function voteCounter() {
    if (democracyVotes > anarchyVotes) {
        currentGameMode = "democracy"
    } else {
        currentGameMode = "anarchy"
    }
    io.emit("game-mode", currentGameMode);
}

function voteCounterDemocracy() {
    var move = -1;
    var max_move_votes_counter = 0;
    for (i = 0; i < democracyMoveVotes.length; i++) {
        if (democracyMoveVotes[i] > max_move_votes_counter && democracyMoveVotes[i] > 0)
            move = i;
    }
    if (move != -1)
        emitMove(null, i);
    democracyMoveVotes = [0, 0, 0, 0];
}
