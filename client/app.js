document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.container');
    const startButton = document.querySelector('#start')
    
    const playerNumber = 4;
    const defusingWireNumber = playerNumber
    const explosionCardNumber = 1
    const totalCardNumber = 40

    const socket = io()

    let rules = [
        {
            playerNumber: 8,
            blue: 5,
            red: 3,
            safeWire: 31
        },
        {
            playerNumber: 7,
            blue: 5,
            red: 3,
            safeWire: 27
        },
        {
            playerNumber: 6,
            blue: 4,
            red: 2,
            safeWire: 23
        },
        {
            playerNumber: 5,
            blue: 3,
            red: 2,
            safeWire: 19
        }
        ,
        {
            playerNumber: 4,
            blue: 3,
            red: 2,
            safeWire: 15
        }
    ]

    let wireCards = [
        {
            type: 'safe',
            img: 'img/cables/safe_wire.jpg'
        },
        {
            type: 'defuse',
            img: 'img/cables/defusing_wire.jpg'
        },
        {
            type: 'bomb',
            img: 'img/cables/bomb.jpg'
        }
    ]

    let roles = [
        {
            type: 'blue',
            img: 'img/roles/blue_card_1.jpg'
        },
        {
            type: 'blue',
            img: 'img/roles/blue_card_2.jpg'
        },
        {
            type: 'blue',
            img: 'img/roles/blue_card_3.jpg'
        },
        {
            type: 'blue',
            img: 'img/roles/blue_card_4.jpg'
        },
        {
            type: 'blue',
            img: 'img/roles/blue_card_5.jpg'
        },
        {
            type: 'red',
            img: 'img/roles/red_card_1.jpg'
        },
        {
            type: 'red',
            img: 'img/roles/red_card_2.jpg'
        },
        {
            type: 'red',
            img: 'img/roles/red_card_3.jpg'
        }
    ]

    // startButton.addEventListener('click', () => {
    //     socket.emit('start')
    // })
    
    socket.on('init-game', gameData => {
        let playerNumber = gameData.playerNumber
        let shuffledRoleCards = gameData.roleCards
        let wires = gameData.wires

        const cardPerPlayer = Math.ceil(wires.length / playerNumber)

        const wiresPerPlayers = new Array(wires.length)
            .fill()
            .map(_ => wires.splice(0, cardPerPlayer))
    })

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


    for (let i = 0; i < playerNumber; i++) {
        const player = document.createElement('div');
        player.className = 'player';
        // player.style.backgroundColor = getRandomColor()
        table.appendChild(player);
    }

    const players = document.querySelectorAll('.player')

    for (let i = 0; i < players.length; i++) {
        let img = '/' + shuffledRoleCards[i].img;

        const playerRole = document.createElement('div');
        const role = document.createElement('img');
        role.src = img
        playerRole.className = 'player-role'
        playerRole.appendChild(role)

        const playerHand = document.createElement('div');
        playerHand.className = 'player-hand'

        const wiresForCurrentPlayer = wiresPerPlayers[i]
        for (let j = 0; j < wiresForCurrentPlayer.length; j++) {
            console.log(i)


            const wire = document.createElement('img');
            let wireImg = '/' + wiresForCurrentPlayer[j].img;
            wire.src = wireImg
            wire.className = 'wireImg'

            const card = document.createElement('div');
            card.className = 'card'

            const backCard = document.createElement('div');
            backCard.className = 'card-back'
            
            const frontCard = document.createElement('div');
            frontCard.className = `card-front ${wiresForCurrentPlayer[j].type}`
            frontCard.hidden = 'true'

            frontCard.appendChild(wire)


            card.appendChild(backCard)
            card.appendChild(frontCard)
            playerHand.appendChild(card)
        }


        players[i].appendChild(playerRole)
        players[i].appendChild(playerHand)
    }

    const playerCards = document.querySelectorAll('.card')
    playerCards.forEach(card => {
        card.addEventListener('click',  function _func(e) {
            console.log(e)
            console.log(card.lastChild)
            card.lastChild.hidden = false
            card.classList.toggle('flip')
            if(card.classList.contains('flip')){
                card.style.cursor = 'default';
                card.removeEventListener('click', _func)
            }
    })
})


})

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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