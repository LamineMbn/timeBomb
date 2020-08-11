const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const _ = require('lodash')
const Player = require("./model/Player")
const Bullet = require("./model/Bullet")

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html')
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(2000, () => {
    console.log('Server listening on port http://localhost:2000/')
})

const DEBUG = true

let SOCKET_LIST = {};

io.sockets.on('connection', (socket) => {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket)

    console.log(`Socket  ${socket.id} connected`);


    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
        Player.onDisconnect(socket)
    })

    socket.on('sendMsgToServer', (data) => {
        let playerName = ("" + socket.id).slice(2, 7);
        _.mapKeys(SOCKET_LIST, allPlayersSocket => {
            allPlayersSocket.emit('addToChat', playerName + ': ' + data);
        })
    });

    socket.on('evalServer', (data) => {
        if (!DEBUG)
            return;
        socket.emit('evalAnswer', eval(data));
    });

});

setInterval(() => {
    let pack = {
        player: Player.update(),
        bullet: Bullet.update()
    }

    _.mapKeys(SOCKET_LIST, (socket) => {
        socket.emit('newPositions', pack)
    })
}, 1000 / 25)