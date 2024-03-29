document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.layout');
    const startButton = document.querySelector('#start')
    let currentPlayer = {}

    // const playerNumber = 4;
    // const defusingWireNumber = playerNumber
    // const explosionCardNumber = 1
    // const totalCardNumber = 40

    const socket = io.connect()
    let room  =  window.location.pathname.substr(1);
    console.log(room)

    socket.on('connect', function() {
        socket.emit('create', room);
    });
    

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


    socket.on('card-flipped', wire => {
        flipCard(wire)
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

    socket.on('game-over', (remainingCards) => {
        let allCards = remainingCards.allCards
        let bombId = remainingCards.bombId
        let defusingWiresIds = remainingCards.defusingWiresIds
        
        setTimeout(function () {
            allCards.forEach(card => flipCard(card))
        }, 500)
        setTimeout(function () {
            let bomb = document.getElementById(`${bombId}`)
            bomb.classList.add('bomb')

            defusingWiresIds.forEach(defusingWireId => {
                let defusingCard = document.getElementById(`${defusingWireId}`)
                if (defusingCard) defusingCard.classList.add('defusingCard')
            })
        }, 700)

    })
    
    function addCardImageToDom(parentDiv, cardData) {
        const existingCardImage = parentDiv.querySelector('.wireImg')
        if(!existingCardImage) {
            const cardImage = createBasicImageWithSourceAndCss('/' + cardData.img, 'wireImg');
            parentDiv.appendChild(cardImage)
        }
    }

    function addEventListenerOnCardsForNextPlayer(cards, previousPlayerId, currentPlayerId) {
        cards.filter(previousAndCurrentPlayerCards(previousPlayerId, currentPlayerId))
            .forEach(card => {
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
        
        let i = 0;

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

            if (isCurrentPlayer(player.id)) {
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
        if (isCurrentPlayer(player.id)) img = '/' + player.role.img;

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
            // const wire = createBasicImageWithSourceAndCss('/' + wiresForCurrentPlayer[j].img, 'wireImg');

            const card = createBasicDivWithCssClass('card');
            card.id = wiresForCurrentPlayer[j].id

            const backCard = createBasicDivWithCssClass('card-back');

            const frontCard = createBasicDivWithCssClass('card-front');
            // frontCard.appendChild(wire)

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
        // flipCard(card)

        let choice = {
            currentPlayer: currentPlayer.id,
            nextPlayer: retrieveSelectedPlayer(card).id,
            cardId: card.id
        }

        console.log(choice)

        socket.emit('card-flip', choice)
    }

    function flipCard(wire) {
        console.log(wire)
        let card = document.getElementById(`${wire.id}`)
        if (!card.classList.contains('flip')) {
            addCardImageToDom(card.lastChild, wire)
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

    function isCurrentPlayerTurn(nextPlayerId) {
        return isCurrentPlayer(nextPlayerId);
    }

    function isNotCurrentPlayerTurnAnymore(previousPlayerId) {
        return isCurrentPlayer(previousPlayerId);
    }

    function isCurrentPlayer(playerId) {
        return playerId === currentPlayer.id;
    }

    function isPlayerTurn(player) {
        return player && player.turn
    }

    function playerIsProtected(player) {
        return player && player.protected
    }
})
