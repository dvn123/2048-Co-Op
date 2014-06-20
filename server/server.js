var io = require('socket.io').listen(80, { log: false });

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
        if (game.getGrid() == grid) {
            io.emit('move', direction);
            game.move(direction);
        }
    });
});



//console.log(JSON.stringify(game, undefined, 2));









