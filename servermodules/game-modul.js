"use strict";

//Export för import i annan fil.
module.exports = {
    
    // Vektor för att spara spelplan i
    gameArea: [],

    playerOneNick: null, // Attribut för att spara nickname på spelare 1
    playerOneColor: null, // Attribut för att spara färg till spelare 1
    playerOneSocketId: null, // Attribut för att spara socket.id för spelare 1
    playerTwoNick: null, // Attribut för att spara nickname på spelare 2
    playerTwoColor: null, // Attribut för att spara färg till spelare 1
    playerTwoSocketId: null, // Attribut för att spara socket.id för spelare 2
    currentPlayer: null, // Attribut för att hålla reda på vems drag det är, sätts till antingen 1 eller 2
    timerId : null, // Attribut för att hålla timerId
    
    /* Metod för att nollaställa spelplan.
    Tar inga invärden och returnerar inget 
    */
   resetGameArea: function() {
       this.gameArea = [0, 0, 0, 0, 0, 0, 0, 0, 0];
   },
    
    /*  Metod utan invärden som kontrollerar om spelet är slut
        Methoden har följande returvärden:
            0 - Spelet ej slut
            1 - Spelare 1 har vunnit
            2 - Spelare 2 har vunnit
            3 - Spelet blev oavgjort
    */
    checkForWinner: function () {
        let winner = 3;
        let gameArray = this.gameArea;

        //Kontrollera om spelplanen är full
        for (let i = 0; i < 9; i++) {
            if (gameArray[i] === 0) {
                winner = 0;
            }
        }

        //Kontrollera horisontellt
        if (gameArray[0] === gameArray[1] && gameArray[0] === gameArray[2] && gameArray[0] !== 0) {
            winner = gameArray[0];
        }
        else if (gameArray[3] === gameArray[4] && gameArray[3] === gameArray[5] && gameArray[3] !== 0) {
            winner = gameArray[3];
        }
        else if (gameArray[6] === gameArray[7] && gameArray[6] === gameArray[8] && gameArray[6] !== 0) {
            winner = gameArray[6];
        }

        //Kontrollera vertikalt
        if (gameArray[0] === gameArray[3] && gameArray[0] === gameArray[6] && gameArray[0] !== 0) {
            winner = gameArray[0];
        }
        else if (gameArray[2] === gameArray[5] && gameArray[2] === gameArray[8] && gameArray[2] !== 0) {
            winner = gameArray[2];
        }
        else if (gameArray[1] === gameArray[4] && gameArray[1] === gameArray[7] && gameArray[1] !== 0) {
            winner = gameArray[1];
        }

        //Kontrollera diagonalt
        if (gameArray[0] === gameArray[4] && gameArray[0] === gameArray[8] && gameArray[0] !== 0) {
            winner = gameArray[0];
        }
        else if (gameArray[6] === gameArray[4] && gameArray[6] === gameArray[2] && gameArray[6] !== 0) {
            winner = gameArray[6];
        }
        console.log('winner: ' + winner);
        return winner;

    },

    /* Metod för att plocka ut kakor är strängen som returneras ifrån request.headers.cookie
       Tar emot strängen som ska parsas som invärde. (socket.handshake.headers.cookie)
       returnerar ett JS-objekt med nyckel-värde par innehållande de kakor som fanns i strängen  
    */
    parseCookies: function (rc) {

        let list = {};
        //*************************************************************************************** */
        //Metod för att parsa cookie-sträng  
        rc && rc.split(';').forEach(function (cookie) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURIComponent(parts.join('=')); 
            /*
                Reviderad 20230419
                decodeURI(parts.join('='));
            */
        });
        //Hämtad ifrån: https://stackoverflow.com/questions/45473574/node-js-cookies-not-working
        //*************************************************************************************** */

        console.log(rc,  list );
        return list;
    }
}
  

