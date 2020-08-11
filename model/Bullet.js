const Entity = require("./Entity")
const Player = require("./Player")
const _ = require('lodash')

let Bullet = (parent, angle) => {
    let self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle / 180 * Math.PI) * 10;
    self.spdY = Math.sin(angle / 180 * Math.PI) * 10;
    self.parent = parent
    self.timer = 0;
    self.toRemove = false;
    let super_update = self.update;
    self.update = () => {
        if (self.timer++ > 100)
            self.toRemove = true;
        super_update();

        _.mapKeys(Player.list, p => {
            if (self.parent !== p.id && self.getDistance(p) < 32) {
                self.toRemove = true;
            }
        })
    }
    Bullet.list[self.id] = self;
    return self;
}

Bullet.list = {};

Bullet.update = function () {
    let pack = [];
    _.mapKeys(Bullet.list, bullet => {
        bullet.update();
        if (bullet.toRemove) {
            delete Bullet.list[bullet.id]
        }
        else
            pack.push({
                x: bullet.x,
                y: bullet.y,
            });
    })
    return pack;
}

module.exports = Bullet