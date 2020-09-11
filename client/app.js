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
    
    socket.on('card-flipped', cardId => {
        let card = document.getElementById(`${cardId}`)
        flipCard(card)
    })
    
    socket.on('next-player-turn', players => {
        players.forEach(player => {
            let playerDiv = document.querySelector(`#${player.id}`)
            const wireCutter = playerDiv.querySelector('.wireCutter')
            const protection = playerDiv.querySelector('.protection')
            
            if(wireCutter.classList.contains('active')) wireCutter.classList.remove('active')
            if(protection.classList.contains('active')) protection.classList.remove('active')
            
            if (isPlayerTurn(player)){
                wireCutter.classList.toggle('active')
            }

            if (playerIsProtected(player)){
                protection.classList.toggle('active')
            }
        })
    })

    socket.on('game-over', (bombId) => {
        let bomb = document.getElementById(`${bombId}`)
        bomb.classList.add('bomb')
        
        let cards = document.querySelectorAll(`.card`)

        setTimeout(function () {
            cards.forEach(card => flipCard(card))
        }, 500)
        
    })    

    function clearTable(){
        let child = table.lastChild
        while (child) {
            table.removeChild(child)
            child = table.lastChild
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

            if (isCurrentPlayer(player)){
                playerDiv.classList.add('current-player')
            }

            if (isPlayerTurn(player)){
                wireCutter.classList.toggle('active')
            }

            if (playerIsProtected(player)){
                protection.classList.toggle('active')
            }

            playerDiv.appendChild(miscCardDiv)
            playerDiv.appendChild(playerRole)
            playerDiv.appendChild(playerHand)
            table.appendChild(playerDiv);
        }
    }


    function createPlayerRoleInDOM(player) {
        let img = '/img/roles/back_card.jpg';
        if(isCurrentPlayer(player)) img = '/' + player.role.img;
        
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

            
            if(isNotCurrentPlayer(player)){
                card.addEventListener('click', flipCardListener, {once : true})
                card.classList.add('pointer')
            }
            

            const backCard = createBasicDivWithCssClass('card-back');

            const frontCard = createBasicDivWithCssClass('card-front');
            frontCard.appendChild(wire)

            card.appendChild(backCard)
            card.appendChild(frontCard)
            playerHand.appendChild(card)
        }
        
        return playerHand;
    }

    function addEvent(node, event, handler, capture) {
        if (!(node in _eventHandlers)) {
            // _eventHandlers stores references to nodes
            _eventHandlers[node] = {};
        }
        if (!(event in _eventHandlers[node])) {
            // each entry contains another entry for each event type
            _eventHandlers[node][event] = [];
        }
        // capture reference
        _eventHandlers[node][event].push([handler, capture]);
        node.addEventListener(event, handler, capture);
    }


    function removeAllEvents(node, event) {
        if (node in _eventHandlers) {
            var handlers = _eventHandlers[node];
            if (event in handlers) {
                var eventHandlers = handlers[event];
                for (var i = eventHandlers.length; i--;) {
                    var handler = eventHandlers[i];
                    node.removeEventListener(event, handler[0], handler[1]);
                }
            }
        }
    }

    function createBasicImageWithSourceAndCss(src, className){
        const img = document.createElement('img');
        img.src = src
        img.className = className
        return img
    }
    
    function createBasicDivWithCssClass(className){
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
        for ( ; cardDiv && cardDiv !== document; cardDiv = cardDiv.parentNode ) {
            if ( cardDiv.matches( '.player' ) ) return cardDiv;
        }
        return null;
    };

    function isNotCurrentPlayer(player) {
        return !isCurrentPlayer(player);
    }

    function isCurrentPlayer(player) {
        return player.id === currentPlayer.id;
    }
    
    function isPlayerTurn(player) {
        return player.turn
    }

    function playerIsProtected(player) {
        return player.protected
    }
})


function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}