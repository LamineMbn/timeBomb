const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 9876
const socketIo = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketIo(server)

const maxPlayerNumber = 4
const explosionCardNumber = 1
const rules = require('./conf/rules.js')
const roles = require('./conf/roles.js')
const wireCards = require('./conf/wire-cards.js')


app.use(express.static(path.join(__dirname, "/client")))

server.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`))

const players = []
let Entity = function () {
    let self = {
        id: "",
        role: "",
        hand: []
    }
    return self;
}


let Player = (id) => {
    let self = new Entity()

    self.id = id

    self.addRole = (role) => {
        self.role = role
    }

    return self
}

io.on('connection', (socket) => {
    console.log(`There is ${io.engine.clientsCount} players`)
    if (io.engine.clientsCount > maxPlayerNumber) {
        console.log('Sorry to many players')
        socket.disconnect()
        console.log('Disconnected...')
        return
    }

    let player = Player(socket.id)
    // if(players.length < 1) {
    console.log(`Player ${player.id} connected`)
    players.push(player)
    // }
    // else console.log('Sorry to many players')

    socket.on('start', () => {
        let playerNumber = players.length
        let defusingWireNumber = playerNumber

        let rule = rules.filter(r => r.playerNumber === playerNumber)[0]

        let blueCards = shuffle(roles.filter(role => role.type === 'blue')).slice(0, rule.blue)
        let redCards = shuffle(roles.filter(role => role.type === 'red')).slice(0, rule.red)
        let shuffledRoleCards = shuffle(blueCards.concat(redCards))

        let safeWires = Array(rule.safeWire).fill(wireCards.filter(wire => wire.type === 'safe')[0])
        let defusingWires = Array(defusingWireNumber).fill(wireCards.filter(wire => wire.type === 'defuse')[0])
        let bomb = Array(explosionCardNumber).fill(wireCards.filter(wire => wire.type === 'bomb')[0])

        let wires = shuffleMultipleTimes(3, safeWires.concat(defusingWires, bomb))

        const cardPerPlayer = Math.ceil(wires.length / playerNumber)

        const wiresPerPlayers = new Array(wires.length)
            .fill()
            .map(_ => wires.splice(0, cardPerPlayer))
        
        let gameData = {
            playerNumber: playerNumber,
            roleCards: shuffledRoleCards,
            wires: wires,
        }
        
        socket.emit('init-game', gameData)

        console.log(wires)
        console.log(wires.length)
    })

    socket.on('affect-role', (role) => {
        player.role = role
    })

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`)
        players.splice(players.indexOf(player), 1)
    })



})

function shuffleMultipleTimes(n, a) {
    for (let i = 0; i < n; i++) {
        a = shuffle(a)
    }
    return a
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}