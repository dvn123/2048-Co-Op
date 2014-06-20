var io = require('socket.io')(80);

var game_state;

var democracy_votes = 0;
var anarchy_votes = 1;

io.on('connection', function (socket) {
    console.log(socket.user.id + ' user connected');
    socket.on('move', function (direction, grid) {
        if (game_state.grid == grid) {
            io.emit('move', direction);
        }
    });
});