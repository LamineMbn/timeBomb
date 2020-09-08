document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.container');
    const startButton = document.querySelector('#start')
    let currentPlayer = {}

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
        console.log(currentPlayer)
    })
    
    socket.on('card-flipped', cardId => {
        let card = document.getElementById(`${cardId}`)
        flipCard(card)
    })

    socket.on('game-over', (bombId) => {
        let bomb = document.getElementById(`${bombId}`)
        bomb.classList.add('bomb')
        
        let cards = document.querySelectorAll(`.card`)
        cards.forEach(card => card.removeEventListener('click', flipCardListener))
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
            console.log(currentPlayer)
            
            if (player.id === currentPlayer.id){
                playerDiv.classList.add('current-player')
            }
            
            // Player Role
            const playerRole = createPlayerRoleInDOM(player);

            // Player Hand
            const playerHand = createPlayerHandInDOM(player);

            playerDiv.appendChild(playerRole)
            playerDiv.appendChild(playerHand)
            table.appendChild(playerDiv);
        }
    }

    function createPlayerRoleInDOM(player) {
        let img = '/img/roles/back_card.jpg';
        if(player.id === currentPlayer.id) img = '/' + player.role.img;
        
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
            
            if(player.id !== currentPlayer.id){
                card.addEventListener('click', flipCardListener(card))
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
    
    function flipCardListener(card) {
        return function _func() {
            flipCard(card, _func)
            socket.emit('card-flip', card.id)
        };
    }

    function flipCard(card, _func) {
        if (!card.classList.contains('flip')) {
            card.classList.toggle('flip')
            card.style.cursor = 'default';
        }
        card.removeEventListener('click', _func)
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