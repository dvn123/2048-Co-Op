var io = require('socket.io').listen(8080, { log: false });

var game_manager = require('./server_game_manager.js');
var game = new game_manager(4);

var democracy_votes = 0;
var anarchy_votes = 1;

var user_count = 0;

io.on('connection', function (socket) {
    user_count++;
    socket.on('get-game-state', function () {
        socket.emit('game-state', game.getGameState());
    });

    socket.on('move', function (direction, grid) {
        if((JSON.stringify(game.getGrid()) == JSON.stringify(grid))) {
            var randoms = game.move(direction);
            io.emit('move', direction, randoms);
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









