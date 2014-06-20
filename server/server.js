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
        var randoms = game.move(direction);
        console.log(JSON.stringify(randoms, undefined, 2));
        io.emit('move', direction, randoms);
    });
});



//console.log(JSON.stringify(game, undefined, 2));









