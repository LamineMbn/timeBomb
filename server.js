const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 9876
const socketIo = require('socket.io')
const app = express()
const server = http.createServer(app)
const {v4: uuidv4} = require('uuid');
const _ = require('lodash')

const io = socketIo(server)

const maxPlayerNumber = 4
const explosionCardNumber = 1
const rules = require('./conf/rules.js')
const roles = require('./conf/roles.js')
const wireCards = require('./conf/wire-cards.js')

app.use(express.static(path.join(__dirname, "/client")))

server.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`))

const players = []
let gameWireCards = []
let shuffledRoleCards = {}
let wireCardsFlipped = []
let bombId = ""

let Entity = function () {
    let self = {
        id: "",
        role: {},
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

let Wire = (type, img) => {
    let self = {}

    self.type = type
    self.img = img
    self.id = uuidv4()

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


    // socket.on('create', function(room) {
    //     socket.join(room);
    // });
    socket.join('room');
    let player = Player(socket.id)
    socket.emit('player-info', player)
    // if(players.length < 1) {
    console.log(`Player ${player.id} connected`)
    players.push(player)
    console.log(players)

    // }
    // else console.log('Sorry to many players')

    socket.on('start', () => {
        let playerNumber = players.length

        const rule = rules.filter(r => r.playerNumber === playerNumber)[0]

        shuffledRoleCards = retrieveShuffledRoleCards(rule);


        gameWireCards = retrieveWires(rule, playerNumber)

        console.log(gameWireCards)

        let gameData = retrieveDataGame(gameWireCards)

        socket.in('room').emit('init-game', gameData)
        socket.emit('init-game', gameData)
    })

    socket.on('card-flip', (cardId) => {
        socket.to('room').emit('card-flipped', cardId)

        setTimeout(checkForNextRound(socket, cardId), 1000)

    })

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`)
        players.splice(players.indexOf(player), 1)
    })


})

function checkForNextRound(socket, cardId) {
    return function () {
        if(gameIsOver(cardId)) {
            socket.emit('game-over', cardId)
            return
        }
        wireCardsFlipped.push(cardId)
        gameWireCards = gameWireCards.filter(wire => wire.id !== cardId)

        if ((wireCardsFlipped.length === players.length) && (gameWireCards.length > players.length)) {
            wireCardsFlipped = []
            let gameData = retrieveDataGame(gameWireCards)
            socket.in('room').emit('init-game', gameData)
            socket.emit('init-game', gameData)
        }
    };
}

function retrieveDataGame(gameWireCards) {
    const wiresPerPlayers = retrieveWiresPerPlayer(gameWireCards);


    for (let i = 0; i < players.length; i++) {
        players[i].role = shuffledRoleCards[i]
        players[i].hand = wiresPerPlayers[i]
    }

    return {players: players}
}

function retrieveShuffledRoleCards(rule) {
    let blueCards = shuffle(roles.filter(role => role.type === 'blue')).slice(0, rule.blue)
    let redCards = shuffle(roles.filter(role => role.type === 'red')).slice(0, rule.red)
    return shuffle(blueCards.concat(redCards));
}

function retrieveWires(rule, playerNumber) {
    let defusingWireNumber = playerNumber

    let safeWire = wireCards.filter(wire => wire.type === 'safe')[0]
    let defusingWire = wireCards.filter(wire => wire.type === 'defuse')[0]
    let bombWire = wireCards.filter(wire => wire.type === 'bomb')[0]

    let safeWires = createWireList(rule.safeWire, safeWire)
    let defusingWires = createWireList(defusingWireNumber, defusingWire)
    let bomb = createWireList(explosionCardNumber, bombWire)
    
    // Bomb info
    bombId = bomb[0].id

    return shuffleMultipleTimes(3, safeWires.concat(defusingWires, bomb));
}

function retrieveWiresPerPlayer(pWires) {
    let wires = Array.from(pWires)
    const cardPerPlayer = Math.ceil(wires.length / players.length)

    return new Array(wires.length)
        .fill()
        .map(_ => wires.splice(0, cardPerPlayer));
}

function createWireList(wireNumber, wireType) {
    let wiresByType = []
    _.range(wireNumber).forEach((value) => {
        wiresByType[value] = Wire(wireType.type, wireType.img)
    })

    return wiresByType;
}

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

function gameIsOver(cardId){
    return cardId === bombId
}