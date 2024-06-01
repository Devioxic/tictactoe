'use strict';

let socket = io();
let globalObject = {};

/* Metod som körs vid socket-händelsen "newGame" 
   Tar emot data som en JSON-sträng innehållande värdeparen:
   - opponentNick (sträng med motståndares namn)
   - opponentColor (sträng med hexvärde på motståndarens färg)
   - myColor (sträng med klientens valda färg )
*/
socket.on('newGame', function (data) {
    
    //Hämta DOM-referenser
    let players = document.querySelector('#players');
    let status = document.querySelector('#status');
    let gameArea = document.querySelector('#gameArea');
    let spinner = document.querySelector('#spinner');

    players.innerHTML =''; //Töm fält med motståndare
    players.textContent = "Din motståndare är " + data.opponentNick; // Uppdatera fält med motståndare
    globalObject.opponentNick = data.opponentNick; // Spara undan nickname på motståndare i globalObject

    // Sätt bakgrundsfärgen på motståndare till motståndarens valda spelfärg
    players.setAttribute('style', 'background-color: ' + decodeURIComponent(data.opponentColor));  //Dessa tre rader decodeURIComponent
    globalObject.opponentColor = decodeURIComponent(data.opponentColor); // Spara motståndares färg i globalObject
    globalObject.myColor = decodeURIComponent(data.myColor); // Spara klientens valda färg i globalObject
    
    //Göm spinner
    spinner.setAttribute('class','d-none');

    //Göm spela-igen-knapp
    document.querySelector('footer').setAttribute('class','d-none');

    //Generera spelplan
    gameArea.innerHTML = ''; // Ta bort eventuell plan från tidigare spel
    createGameArea(gameArea); // Skapa ny spelplan

    //Sätt text i meddelandefält
    status.textContent = globalObject.opponentNick + 's drag';

    console.log('socket.on newGame');
    
});

/* Metod som körs vid socket-händelsen "yourMove"
   Tar emot data som en JSON-sträng innehållande värdeparen:
   - cellId (heltal eller null med index på ruta ifrån motståndares drag, null om drag saknas)
   - Om inget motståndardrag gjorts skickas null som invärde.
   */
socket.on('yourMove', function (data) {
    //Kolla om motståndares bricka skall ritas ut
    if(data != null) {

        console.log('socket.on yourMove', data);
        //Rita färg
        document.querySelector('td[data-cellId="' + data.cellId + '"]').style.backgroundColor = globalObject.opponentColor;
    
        //Gör ej klickbar
        document.querySelector('td[data-cellId="' + data.cellId + '"]').setAttribute('data-inGame','false');
    }
       
    // Lägg lyssnare till tabellen
    addListenerToTable();

    // Uppdatera status
    document.querySelector('#status').textContent = 'Ditt drag';

    console.log('socket.on yourMove');

});

/* Metod som körs vid socket-händelsen "gameover"
   Tar emot data som en sträng innehållande meddelande om vem som vann
*/
socket.on('gameover', function (data) {
    //Spelet slut, ta bort lyssnare
    removeListenerFromTable();

    //Uppdatera status
    document.querySelector('#status').textContent = data;

    //Koppla ned anslutning
    socket.disconnect();

    //Visa spela-igen-knapp
    document.querySelector('footer').setAttribute('class', 'text-center pt-5');

    console.log('socket.on gameover');

});


/* 
    Metod som körs vid socket-händelsen "timeout"
*/
socket.on('timeout', function () {

    // Tiden gick ut, draget går över till motståndaren
    
    //Ta bort lyssnare
    removeListenerFromTable();

    //Uppdatera status
    document.querySelector('#status').textContent = globalObject.opponentNick + 's drag';

    console.log('socket.on timeout');

});

/* Funktion som körs vid klick på tabellen.
   Tar emot ett händelseobjekt. Inget returvärde
*/
function executeMove(evt) {
    
    //Kontrollera om giltig ruta, en td och inte redan spelad
    if (evt.target.nodeName === "TD" && evt.target.getAttribute('data-inGame') === 'true') {

        //OK, uppdatera färg på td
        evt.target.style.backgroundColor = globalObject.myColor;

        //Markera bricka som spelad
        evt.target.setAttribute('data-inGame','false');

        //Ta bort lyssnare
        removeListenerFromTable();

        console.log('executeMove', evt.target.getAttribute('data-cellId'));

        //Skicka drag till server
        socket.emit('newMove', { "cellId" : evt.target.getAttribute('data-cellId') });

        //Uppdera status
        document.querySelector('#status').textContent = globalObject.opponentNick + "'s drag";
    }
 
}

/* Funktion ritar upp spelplanen. Tar emot en referens till elementet den skll ritas i, inget returvärde. */
function createGameArea(gameDiv) {

    //Räknare för numrering av spelrutor
    let cellId = 0;
    
    //Generera spelplan
    let table = document.createElement('table');
    table.classList.add('ml-0', 'mr-0');

    for (let i = 0; i < 3; i++) {
        let row = document.createElement('tr');

        for (let j = 0; j < 3; j++) {

            let col = document.createElement('td');
            col.style = "width: 125px; height:125px; border: solid 1px darkgray; font-size: 50px; text-align: center;";            
            col.setAttribute('data-cellId',cellId);   
            col.setAttribute('data-inGame', 'true');                   
            row.appendChild(col);
            cellId++;
        } 
        table.appendChild(row);
    } 
    //Lägg till spelplanen i medskickat element
    gameDiv.appendChild(table);
}


// Funktion för att ta bort en lyssnare efter klick på spelplanen (tabellen)
function removeListenerFromTable() {
    document.querySelector("table").removeEventListener("click", executeMove);
}

// Funktion för att lägga till en lyssnare efter klick på spelplanen (tabellen)
function addListenerToTable() {
    document.querySelector("table").addEventListener("click", executeMove);
}