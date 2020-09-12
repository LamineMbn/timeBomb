document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.layout');
    const startButton = document.querySelector('#start')
    let currentPlayer = {}
    let _eventHandlers = {};

    // const playerNumber = 4;
    // const defusingWireNumber = playerNumber
    // const explosionCardNumber = 1
    // const totalCardNumber = 40

    const socket = io.connect()
    socket.emit('create', 'room');

    startButton.addEventListener('click', () => {
        socket.emit('start')
    })

    socket.on('init-game', gameData => {
        initGame(gameData)
    })

    socket.on('player-info', player => {
        currentPlayer = player
    })

    socket.on('all-player-info', players => {
        currentPlayer = players.filter(player => player.id === currentPlayer.id)[0]
    })


    socket.on('card-flipped', cardId => {
        let card = document.getElementById(`${cardId}`)
        flipCard(card)
    })

    socket.on('next-player-turn', dataForNextRound => {
        let {previousPlayerId, nextPlayerId, protectedPlayerId} = dataForNextRound
        let previousPlayerDiv = document.getElementById(`${previousPlayerId}`)
        let nextPlayerDiv = document.getElementById(`${nextPlayerId}`)
        let protectedPlayerDiv = document.getElementById(`${protectedPlayerId}`)
        
        const previousWireCutter = previousPlayerDiv.querySelector('.wireCutter')
        const nextPlayerWireCutter = nextPlayerDiv.querySelector('.wireCutter')
        
        const previousPlayerProtection = previousPlayerDiv.querySelector('.protection')
        const protectedPlayerProtection = protectedPlayerDiv.querySelector('.protection')

        previousWireCutter.classList.remove('active')
        protectedPlayerProtection.classList.remove('active')
        
        previousPlayerProtection.classList.toggle('active')
        nextPlayerWireCutter.classList.toggle('active')

        let cards = [...document.querySelectorAll(`.card`)]

        if(isNotCurrentPlayerTurnAnymore(previousPlayerId)) removeEventListenerOnCardForSpecificPlayer(cards);

        if(isCurrentPlayerTurn(nextPlayerId)) addEventListenerOnCardsForNextPlayer(cards, previousPlayerId, nextPlayerId);
    })

    socket.on('game-over', (bombId) => {
        let bomb = document.getElementById(`${bombId}`)
        bomb.classList.add('bomb')

        let cards = document.querySelectorAll(`.card`)

        setTimeout(function () {
            cards.forEach(card => flipCard(card))
        }, 500)

    })

    function addEventListenerOnCardsForNextPlayer(cards, previousPlayerId, currentPlayerId) {
        cards.filter(previousAndCurrentPlayerCards(previousPlayerId, currentPlayerId))
            .forEach(card => {
                console.log(card)
                card.addEventListener('click', flipCardListener, {once: true})
                card.classList.add('pointer')
            })
    }

    function previousAndCurrentPlayerCards(previousPlayerId, currentPlayerId) {
        return card => ![previousPlayerId, currentPlayerId].includes(card.parentElement.parentElement.id);
    }

    function removeEventListenerOnCardForSpecificPlayer(cards) {
        cards
            .forEach(card => {
                card.removeEventListener('click', flipCardListener, {once: true})
                card.classList.remove('pointer')
            })
    }

    function clearTable() {
        let child = table.lastChild
        while (child) {
            table.removeChild(child)
            child = table.lastChild
        }
    }

    // TODO UPDATE ME
    function updateEventListeners() {
        console.log(currentPlayer)
        let cards = [...document.querySelectorAll(`.card`)]
        if (isPlayerTurn(currentPlayer)) {

            console.log(cards)
            cards.filter(card => card.parentElement.parentElement.id !== currentPlayer.id)
                .forEach(card => {
                    console.log(card)
                    card.addEventListener('click', flipCardListener, {once: true})
                    card.classList.add('pointer')
                })
        }
    }

    function initGame(gameData) {
        clearTable()
        let players = gameData.players

        for (let player of players) {
            const playerDiv = createBasicDivWithCssClass('player');
            playerDiv.id = player.id

            // Player Role
            const playerRole = createPlayerRoleInDOM(player);

            // Player Hand
            const playerHand = createPlayerHandInDOM(player);

            const miscCardDiv = createBasicDivWithCssClass('miscCard');
            const wireCutter = createBasicDivWithCssClass('wireCutter');
            const protection = createBasicDivWithCssClass('protection');

            miscCardDiv.appendChild(wireCutter)
            miscCardDiv.appendChild(protection)

            if (isCurrentPlayer(player)) {
                playerDiv.classList.add('current-player')
            }

            if (isPlayerTurn(player)) {
                wireCutter.classList.toggle('active')
            }

            if (playerIsProtected(player)) {
                protection.classList.toggle('active')
            }

            playerDiv.appendChild(miscCardDiv)
            playerDiv.appendChild(playerRole)
            playerDiv.appendChild(playerHand)
            table.appendChild(playerDiv);
        }
        updateEventListeners();
    }


    function createPlayerRoleInDOM(player) {
        let img = '/img/roles/back_card.jpg';
        if (isCurrentPlayer(player)) img = '/' + player.role.img;

        const playerRole = document.createElement('div');
        const role = document.createElement('img');
        role.src = img
        playerRole.className = 'player-role'
        playerRole.appendChild(role)
        return playerRole;
    }

    function createPlayerHandInDOM(player) {
        let wiresForCurrentPlayer = player.hand
        const playerHand = createBasicDivWithCssClass('player-hand');

        for (let j = 0; j < wiresForCurrentPlayer.length; j++) {
            const wire = createBasicImageWithSourceAndCss('/' + wiresForCurrentPlayer[j].img, 'wireImg');

            const card = createBasicDivWithCssClass('card');
            card.id = wiresForCurrentPlayer[j].id


            const backCard = createBasicDivWithCssClass('card-back');

            const frontCard = createBasicDivWithCssClass('card-front');
            frontCard.appendChild(wire)

            card.appendChild(backCard)
            card.appendChild(frontCard)
            playerHand.appendChild(card)
        }

        return playerHand;
    }

    function createBasicImageWithSourceAndCss(src, className) {
        const img = document.createElement('img');
        img.src = src
        img.className = className
        return img
    }

    function createBasicDivWithCssClass(className) {
        const div = document.createElement('div');
        div.className = className
        return div
    }

    function flipCardListener(event) {
        let card = event.target.parentElement
        flipCard(card)

        let choice = {
            currentPlayer: currentPlayer.id,
            nextPlayer: retrieveSelectedPlayer(card).id,
            cardId: card.id
        }

        console.log(choice)

        socket.emit('card-flip', choice)
    }

    function flipCard(card) {
        if (!card.classList.contains('flip')) {
            card.classList.toggle('flip')
            card.style.cursor = 'default';
        }

        card.removeEventListener('click', flipCardListener)

    }

    function retrieveSelectedPlayer(cardDiv) {
        for (; cardDiv && cardDiv !== document; cardDiv = cardDiv.parentNode) {
            if (cardDiv.matches('.player')) return cardDiv;
        }
        return null;
    };

    function isCurrentPlayer(player) {
        return player.id === currentPlayer.id;
    }

    function isCurrentPlayerTurn(nextPlayerId) {
        return nextPlayerId === currentPlayer.id;
    }

    function isNotCurrentPlayerTurnAnymore(previousPlayerId) {
        return previousPlayerId === currentPlayer.id;
    }

    function isPlayerTurn(player) {
        return player && player.turn
    }

    function playerIsProtected(player) {
        return player && player.protected
    }
})