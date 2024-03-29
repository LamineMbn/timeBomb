const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 9876
const socketIo = require('socket.io')
const app = express()
const server = http.createServer(app)
const _ = require('lodash')

const Wire = require('./model/Wire')
const Player = require('./model/Player')

const io = socketIo(server)

app.use(express.static(path.join(__dirname, "/client")))

app.get('/:id', ((req, res) => {
    res.sendFile(path.join(__dirname + '/client/timeBomb.html'))
}))

server.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`))


const explosionCardNumber = 1
const rules = require('./conf/rules.js')
const roles = require('./conf/roles.js')
const wireCards = require('./conf/wire-cards.js')

const maxPlayerNumber = _.maxBy(rules, rule => rule.playerNumber).playerNumber
const minPlayerNumber = _.minBy(rules, rule => rule.playerNumber).playerNumber

let playersInRoom = 0
const players = []
let gameWireCards = []
let shuffledRoleCards = {}
let wireCardsFlipped = []
let bombCard = Wire()
let defusingWireCards = []
let defusingWiresIds = []
let defusingWiresFound = 0


function notEnoughPlayers(room){
    return retrievePlayersInRoom(room) < minPlayerNumber
}

function tooMuchPlayers(room){
    return retrievePlayersInRoom(room) > maxPlayerNumber
}

let room = ""


function retrievePlayersInRoom(roomToJoin) {
    return io.sockets.adapter.rooms[roomToJoin] ? io.sockets.adapter.rooms[roomToJoin].length : 0;
}

io.on('connection', (socket) => {

    let player = Player(socket.id)
    
    socket.on('create', function(roomToJoin) {

        socket.join(roomToJoin);
        
        socket.emit('player-info', player)
        console.log(`Player ${player.id} connected`)
        players.push(player)
        
        room = roomToJoin
    });

    socket.on('join', function(roomToJoin) {

        playersInRoom = retrievePlayersInRoom(roomToJoin)

        if (tooMuchPlayers(roomToJoin)) {
            console.log('Sorry to many players')
            socket.disconnect()
            console.log('Disconnected...')
            return
        }

        socket.join(roomToJoin);
        console.log(`There is ${playersInRoom} players`)
        console.log(io.sockets.adapter.rooms[roomToJoin].length)



        socket.emit('player-info', player)
        console.log(`Player ${player.id} connected`)
        players.push(player)

        room = roomToJoin
    });

    socket.on('start', () => {        
        if (notEnoughPlayers(room)){
            console.log('Sorry not enough players')
            return
        }
        
        let playerNumber = players.length

        const rule = rules.filter(r => r.playerNumber === playerNumber)[0]

        computeInitialData(playerNumber, rule)

        let gameData = retrieveDataGame(gameWireCards)
        emitPlayersInformations(socket, gameData.players);

        console.table(players)

        socket.in(room).emit('init-game', gameData)
        socket.emit('init-game', gameData)
    })

    socket.on('card-flip', (choice) => {
        const {currentPlayer, nextPlayer: selectedPlayer, cardId} = choice
        const wire = retrieveWireById(cardId)
        socket.to(room).emit('card-flipped', wire)
        socket.emit('card-flipped', wire)

        if (defusingWiresIds.includes(cardId)) incrementNumberOfDefusingWiresFound()

        let previousProtectedPlayer = players.filter(player => player.protected)[0]
        
        switchPlayers(currentPlayer, selectedPlayer)
        
        emitPlayersInformations(socket, players)
        
        let dataForNextRound = {
            previousPlayerId : currentPlayer,
            nextPlayerId : selectedPlayer,
            cardId: cardId,
            protectedPlayerId: (previousProtectedPlayer) ? previousProtectedPlayer.id : currentPlayer
        }
        
        console.table(dataForNextRound)
        

        setTimeout(checkForNextRound, 800, socket, dataForNextRound)

    })

    socket.on('wire-image', (wireId) => {
        console.log(`Get wire image for id ${wireId}`)
        const wireImage = retrieveWireById(wireId)
        socket.to(room).emit('wire-image', wireImage)
    })

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`)
        players.splice(players.indexOf(player), 1)
        socket.leave(room)
    })


})

function emitPlayersInformations(socket, players) {
    socket.in(room).emit('all-player-info', players)
    socket.emit('all-player-info', players)
}


function computeInitialData(playerNumber, rule) {

    selectStartingPlayerRandomly()

    defusingWiresFound = 0

    shuffledRoleCards = retrieveShuffledRoleCards(rule);

    gameWireCards = retrieveWires(rule, playerNumber)

    bombCard = retrieveBombCard(gameWireCards)
    console.log(bombCard)

    defusingWireCards = retrieveDefusingWireCards(gameWireCards)
    defusingWiresIds = defusingWireCards.map(wire => wire.id)

}

function retrieveWireById(wireId) {
    return gameWireCards.filter(wire => wire.id === wireId)[0]
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

function checkForNextRound(socket, dataForNextRound) {
    let cardId = dataForNextRound.cardId
    if (gameIsOver(cardId)) {
        console.log(cardId)
        let remainingCards = {
            allCards: gameWireCards,
            bombId: bombCard.id,
            defusingWiresIds: defusingWiresIds
        }
        socket.in(room).emit('game-over', remainingCards)
        socket.emit('game-over', remainingCards)
        return
    }

    wireCardsFlipped.push(cardId)
    gameWireCards = gameWireCards.filter(wire => wire.id !== cardId)

    socket.in(room).emit('next-player-turn', dataForNextRound)
    socket.emit('next-player-turn', dataForNextRound)

    if ((wireCardsFlipped.length === players.length) && (gameWireCards.length > players.length)) {
        wireCardsFlipped = []
        let gameData = retrieveDataGame(gameWireCards)
        socket.in(room).emit('init-game', gameData)
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

function retrieveBombCard(wires) {
    return retrieveWiresByType(wires, 'bomb')[0]
}

function retrieveDefusingWireCards(wires) {
    return retrieveWiresByType(wires, 'defuse')
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
    return isBomb(cardId) || bombDefused();
    // return bombDefused();
}

function isBomb(cardId) {
    return cardId === bombCard.id
}

function bombDefused() {
    console.log(`${defusingWiresFound}/${defusingWireCards.length} wires found`)
    return defusingWiresFound === defusingWireCards.length
}
