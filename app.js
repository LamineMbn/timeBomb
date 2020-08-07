const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const _ = require('lodash')

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html')
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(2000, () => {
    console.log('Server listening on port http://localhost:2000/')
})


let SOCKET_LIST = [];

let PLAYER_LIST = [];

let Entity = function(){
    let self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}

let Player = (id) => {
    let self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;

    let super_update = self.update;
    self.update = function(){
        self.updateSpd();
        super_update();
    }


    self.updateSpd = () => {
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;

        if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if(self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}

Player.list = [];
Player.onConnect = (socket) => {
    let player = Player(socket.id)
    socket.on('keyPress',function(data){
        if(data.inputId === 'ArrowLeft')
            player.pressingLeft = data.state;
        else if(data.inputId === 'ArrowRight')
            player.pressingRight = data.state;
        else if(data.inputId === 'ArrowUp')
            player.pressingUp = data.state;
        else if(data.inputId === 'ArrowDown')
            player.pressingDown = data.state;
    });
}

Player.onDisconnect = (socket) => {
    delete Player.list[socket.id]
}

Player.update = () => {
    let pack = []
    _.mapKeys(Player.list, (player) => {
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        })
    })
    return pack;
}

io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket)
    
    console.log(`Socket  ${socket.id} connected`);

    
    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
        Player.onDisconnect(socket)
    })

});

setInterval(() => {
    let pack = Player.update()

    _.mapKeys(SOCKET_LIST, (socket) => {
        socket.emit('newPositions', pack)
    })
}, 1000/25)