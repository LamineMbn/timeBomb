const {v4: uuidv4} = require("uuid");

let Wire = (type, img) => {
    let self = {}

    self.type = type
    self.img = img
    self.id = uuidv4()

    return self
}

module.exports = Wire
