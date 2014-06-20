var io = require('socket.io')(80);

io.on('connection', function(socket){
    console.log(socket.user.id + ' user connected');
    socket.on('move', function(direction) {

    });
});
