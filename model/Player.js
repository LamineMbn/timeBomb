const Entity = require("./Entity")

let Player = (id) => {
    let self = new Entity()

    self.id = id
    self.name = ""
    self.turn = false
    self.protected = false

    self.addRole = (role) => {
        self.role = role
    }

    return self
}

module.exports = Player
