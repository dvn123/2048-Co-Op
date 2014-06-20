var io = require("socket.io").listen(8080, { log: false });
var winston = require("winston"); //logger

var logger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: "2048-Co-Op.log" })
    ]
});

var game_manager = require("./server_game_manager.js");
var game = new game_manager(4);

var current_game_mode = "anarchy";
var democracy_votes = 0;
var anarchy_votes = 1;

var user_count = 0;

io.on("connection", function (socket) {
    user_count++;
    socket.on("get-game-state", function () {
        socket.emit("game-state", game.getGameState());
    });

    socket.on("democracy-vote", function () {
       io.emit("democracy-vote", ++democracy_votes);
    });

    socket.on("anarchy-vote", function () {
        io.emit("anarchy-vote", ++anarchy_votes);
    });

    socket.on("move", function (direction, grid) {
        if((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            var randoms = game.move(direction);
            io.emit("move", direction, randoms);
            logger.log("info", "MOVE: Author - " + socket.id + "Direction: - " + direction + "\n");
            logger.log("info", "GAME_STATE: " + game.getGrid() + "\n");
        }
    });
});

/*
function isEqual(grid1, grid2) {
    if(grid1.length != 2 || grid2.length != 2)
        return false;
    //for(i = 0; i < grid1.length, i++) {
        grid1[1] == grid2[]
    //}
}
*/

//console.log(JSON.stringify(game, undefined, 2));









