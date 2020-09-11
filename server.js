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
let defusingWiresIds = []
let defusingWiresFound = 0

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
    self.turn = false
    self.protected = false

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

        computeInitialData(playerNumber, rule)

        console.log(players)

        let gameData = retrieveDataGame(gameWireCards)

        socket.in('room').emit('init-game', gameData)
        socket.emit('init-game', gameData)
    })

    socket.on('card-flip', (choice) => {
        const {currentPlayer, nextPlayer: selectedPlayer, cardId} = choice
        socket.to('room').emit('card-flipped', cardId)

        if (defusingWiresIds.includes(cardId)) incrementNumberOfDefusingWiresFound()

        switchPlayers(currentPlayer, selectedPlayer)
        console.log(choice)
        console.log(players)

        setTimeout(checkForNextRound, 800, socket, cardId)

    })

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`)
        players.splice(players.indexOf(player), 1)
    })


})

function computeInitialData(playerNumber, rule) {

    selectStartingPlayerRandomly()

    defusingWiresFound = 0

    shuffledRoleCards = retrieveShuffledRoleCards(rule);

    gameWireCards = retrieveWires(rule, playerNumber)

    bombId = retrieveBombId(gameWireCards)
    console.log(bombId)

    defusingWiresIds = retrieveDefusingWiresId(gameWireCards)

}

function switchPlayers(currentPlayerId, nextPlayerId) {
    resetProtections()
    players.filter(player => player.id === currentPlayerId).map(togglePlayerTurnProtection)
    players.filter(player => player.id === nextPlayerId).map(togglePlayerTurn)
}

function togglePlayerTurnProtection(player) {
    player.protected = !player.protected
    player.turn = !player.turn
}


function togglePlayerTurn(player) {
    player.turn = !player.turn
}

function selectStartingPlayerRandomly() {
    resetTurns()
    resetProtections()
    retrieveRandomPlayer().turn = true
}

function resetTurns() {
    players.forEach(player => player.turn = false)
}

function resetProtections() {
    players.forEach(player => player.protected = false)
}

function retrieveRandomPlayer() {
    return players[Math.floor(Math.random() * players.length)];
}

function checkForNextRound(socket, cardId) {
    if (gameIsOver(cardId)) {
        console.log(cardId)
        socket.in('room').emit('game-over', bombId)
        socket.emit('game-over', bombId)
        return
    }

    wireCardsFlipped.push(cardId)
    gameWireCards = gameWireCards.filter(wire => wire.id !== cardId)

    socket.in('room').emit('next-player-turn', players)
    socket.emit('next-player-turn', players)

    if ((wireCardsFlipped.length === players.length) && (gameWireCards.length > players.length)) {
        wireCardsFlipped = []
        let gameData = retrieveDataGame(gameWireCards)
        socket.in('room').emit('init-game', gameData)
        socket.emit('init-game', gameData)
    }
}

function incrementNumberOfDefusingWiresFound() {
    defusingWiresFound++
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

    let safeWire = retrieveWiresByType(wireCards, 'safe')[0]
    let defusingWire = retrieveWiresByType(wireCards, 'defuse')[0]
    let bombWire = retrieveWiresByType(wireCards, 'bomb')[0]

    let safeWires = createWireList(rule.safeWire, safeWire)
    let defusingWires = createWireList(defusingWireNumber, defusingWire)
    let bomb = createWireList(explosionCardNumber, bombWire)

    return shuffleMultipleTimes(3, safeWires.concat(defusingWires, bomb));
}

function retrieveWiresByType(wires, type) {
    return wires.filter(wire => wire.type === type)
}

function retrieveBombId(wires) {
    return retrieveWiresByType(wires, 'bomb')[0].id
}

function retrieveDefusingWiresId(wires) {
    return retrieveWiresByType(wires, 'defuse').map(defuse => defuse.id)
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

function gameIsOver(cardId) {
    // return isBomb(cardId) || bombDefused();
    return bombDefused();
}

function isBomb(cardId) {
    return cardId === bombId
}

function bombDefused() {
    console.log(`${defusingWiresFound}/${defusingWiresIds.length} wires found`)
    return defusingWiresFound === defusingWiresIds.length
}