const Entity = require("./Entity")
const Bullet = require("./Bullet")
const _ = require('lodash')

let Player = (id) => {
    let self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;

    let super_update = self.update;
    self.update = function () {
        self.updateSpd();
        super_update();

        if (self.pressingAttack) {
            self.shootBullet(self.mouseAngle)
        }
    }

    self.shootBullet = function (angle) {
        let b = Bullet(self.id, angle);
        b.x = self.x;
        b.y = self.y;
    }


    self.updateSpd = () => {
        if (self.pressingRight)
            self.spdX = self.maxSpd;
        else if (self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;

        if (self.pressingUp)
            self.spdY = -self.maxSpd;
        else if (self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}

Player.list = {};

Player.onConnect = (socket) => {
    let player = Player(socket.id)
    socket.on('keyPress', function (data) {
        if (data.inputId === 'ArrowLeft')
            player.pressingLeft = data.state;
        else if (data.inputId === 'ArrowRight')
            player.pressingRight = data.state;
        else if (data.inputId === 'ArrowUp')
            player.pressingUp = data.state;
        else if (data.inputId === 'ArrowDown')
            player.pressingDown = data.state;
        else if (data.inputId === 'attack')
            player.pressingAttack = data.state;
        else if (data.inputId === 'mouseAngle')
            player.mouseAngle = data.state;
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

module.exports = Player
exports.list = Player.list