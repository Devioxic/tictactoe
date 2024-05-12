const fs = require('fs');
const path = require('path');
const vm = require('vm');
const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
let errors = Array();
const autoDirectory = path.join(__dirname, "/");
const serverDirectory = path.join(__dirname, '..');

/*
const arg1 = process.argv[2];
let task = arg1 || "1";
task = parseInt(task);

const arg2 = process.argv[3];
let serverFile = arg2 || "server.js";

const arg3 = process.argv[4];
let serverPort = arg3 || 3000;
serverPort = parseInt(serverPort);
*/
let task, serverFile, serverPort;


async function promptQuestions() {
    console.log("\n\n--------- Välj laboration och fil ---------");
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'task',
            message: 'Laboration: '
        },
        {
            type: 'input',
            name: 'serverFile',
            message: 'Namnet på server-filen: '
        },
        {
            type: 'input',
            name: 'serverPort',
            message: 'Portnummer: '
        },
      
    ]);

    /*
      {
            type: 'list',
            name: 'favoriteColor',
            message: 'What is your favorite color?',
            choices: ['Red', 'Blue', 'Green', 'Yellow']
        }
    **/
    task = parseInt(answers.task);
    serverFile = answers.serverFile;
    serverPort = parseInt(answers.serverPort);

    console.log("--------- Startar AutoFeedback ---------\n\n");

    startAutoFeedback();
}



promptQuestions();



let gameModuleExist = false;
let globalObjectModule = null;
function startAutoFeedback(){
    const serverCode = fs.readFileSync(path.join(__dirname, '../' + serverFile), 'utf8');


    process.chdir(serverDirectory);
    
    
   
    
    const customRequire = (module) => {
        try {
            return require(module);
        } catch (error) {
            
            let absolutePath = path.resolve(serverDirectory, module);
            
            if(absolutePath.includes("game-modul.js")){
                globalObjectModule = require(absolutePath);
                gameModuleExist = true;
            }
            return require(absolutePath);
        }
    };
      
    eval(`(function(require, __dirname) { ${serverCode} })`)(customRequire, serverDirectory);
    
    if(task == 1){
        launchTask1();
    }else if(task == 2){
        launchTask2();
    }else{
        console.log("Du försöker starta en laboration som inte finns. Du kan bara välja mellan 1 och 2");
        process.exit();
    }
    
    
    if(!gameModuleExist){
        addError(errors, 6, "game-modul.js", "Modules i game-modul.js är inte importerad!");
    }
}



let pageTurnIndex = -1;
async function launchTask2(){
    let headless = "new";
    const browser = await puppeteer.launch({
        headless: headless
    });
    const browser2 = await puppeteer.launch({
        headless: headless
    });
    const browser3 = await puppeteer.launch({
        headless: headless
    });

    let browsers = Array();
    browsers.push(browser);
    browsers.push(browser2);
    browsers.push(browser3);
    let pages = Array();

    let p1Page = await browser.newPage();
    pages.push(p1Page);
    await p1Page.goto('http://localhost:' + serverPort);


    let p2Page = await browser2.newPage();
    pages.push(p2Page);
    await p2Page.goto('http://localhost:' + serverPort);

    let p3Page = await browser3.newPage();
    pages.push(p3Page);
    await p3Page.goto('http://localhost:' + serverPort);


    let playerIndex = 1;
    //let page = pages[0];


    for(let page of pages){
        let inputElement = await page.$('#nick_1');
        let inputColor = await page.$("#color_1");
        let submitBtn = await page.$("button[type='submit']");
        let errorMsg = await page.$("#errorMsg");


        await inputElement.type('Player ' + playerIndex);
        await page.evaluate((inputSelector, playerIndex) => {
            let color = "#ff0000";

            if(playerIndex == 2){
                color = "#00cc00";
            }else if(playerIndex == 3){
                color = "#f6f6f6";
            }
            document.querySelector(inputSelector).value = color;
        }, "#color_1", playerIndex);
    
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        await page.waitForTimeout(250);
        if(playerIndex == 1){
            if(globalObjectModule.playerOneNick != "Player 1"){
                addError(errors, 10, "GlobalObject P1 namn", "Spelare 1 har inte korrekt namn från Game-modul.js");
            }
            if(!globalObjectModule.playerOneColor.includes("ff0000")){
                addError(errors, 11, "GlobalObject P1 color", "Spelare 1 har inte korrekt färg från Game-modul.js");
            }
            if(globalObjectModule.playerOneSocketId == null){
                addError(errors, 12, "GlobalObject P1 Socket ID", "Spelare 1 har inget socket id");
            }
        }else if(playerIndex == 2){
            if(globalObjectModule.playerTwoNick != "Player 2"){
                addError(errors, 13, "GlobalObject P2 namn", "Spelare 2 har inte korrekt namn från Game-modul.js");
            }
            if(!globalObjectModule.playerTwoColor.includes("00cc00")){
                addError(errors, 14, "GlobalObject P2 color", "Spelare 2 har inte korrekt färg från Game-modul.js");
            }
            if(globalObjectModule.playerTwoSocketId == null){
                addError(errors, 15, "GlobalObject P2 Socket ID", "Spelare 2 har inget socket id");
            }
        }


        playerIndex++;
    }
    
    let gameAreaPass = false;
    if(globalObjectModule.gameArea != null){
        if(globalObjectModule.gameArea.length == 9){
            gameAreaPass = true;
        }
    }
    if(!gameAreaPass){
        addError(errors, 16, "Fel vid start av spel", "Något är fel när spelet ska starta. GameArea i från game-modul.js har inget värde när spelet har startat.");
    }

    (async () => {
        pages.splice(-1);
        browsers.splice(-1);
        await browser3.close();
    })();


    let index = 0;
    for(let page of pages){
        let statusP1 = await page.$("#status");

        let statusText = await page.evaluate(statusP1 => {
            return statusP1.textContent;
        }, statusP1);

        if(statusText == "Ditt drag"){
            pageTurnIndex = index;
        }
        index++;
    }


    await playATurn(pages[pageTurnIndex], 0, 250);
    await playATurn(pages[pageTurnIndex], 3, 250);
    await playATurn(pages[pageTurnIndex], 1, 250);
    await playATurn(pages[pageTurnIndex], 4, 250);
    await playATurn(pages[pageTurnIndex], 2, 250);
   

    pageTurnIndex = getNextPlayer();
    let winnerText = await pages[pageTurnIndex].evaluate(element => {
        return document.querySelector(element).textContent;
    }, "#status");

    if(winnerText.toLowerCase().includes("vann".toLowerCase()) || winnerText.toLowerCase().includes("vunnit".toLowerCase()) || winnerText.toLowerCase().includes("vinnare".toLowerCase())){
        console.log("We have a winner wohooo");
    }else{
        //addError("")
        addError(errors, 17, "Fel vid vinnst", "Nu ska spelet vara slut, men det står inget om att någon har vunnit/vann.");
    }
   

    for(let page of pages){
        let playAgainButton = await page.$("a[href='/']");
        await playAgainButton.click();
    }

    index = 0;
    for(let page of pages){
        let statusP1 = await page.$("#status");

        let statusText = await page.evaluate(statusP1 => {
            return statusP1.textContent;
        }, statusP1);

        if(statusText == "Ditt drag"){
            pageTurnIndex = index;
        }
        index++;
    }



    await playATurn(pages[pageTurnIndex], 0, 250);
    await playATurn(pages[pageTurnIndex], 3, 6000);
    await playATurn(pages[pageTurnIndex], 1, 250);
    await playATurn(pages[pageTurnIndex], 4, 6000);
    await playATurn(pages[pageTurnIndex], 2, 250);
    await playATurn(pages[pageTurnIndex], 5, 250);


    pageTurnIndex = getNextPlayer();
    winnerText = await pages[pageTurnIndex].evaluate(element => {
        return document.querySelector(element).textContent;
    }, "#status");

    if(winnerText.toLowerCase().includes("vann".toLowerCase()) || winnerText.toLowerCase().includes("vunnit".toLowerCase()) || winnerText.toLowerCase().includes("vinnare".toLowerCase())){
        console.log("We have a winner wohooo AGAIN!!!");
    }else{
        //addError("")
        addError(errors, 17, "Fel vid vinnst", "Nu ska spelet vara slut, men det står inget om att någon har vunnit/vann.");
    }


    startFeedbackServer(errors);
    
}

async function playATurn(page, index, wait = 1000){
    let td = await getTdFromPage(page, index);
    await td.click();
    pageTurnIndex = getNextPlayer();
    await page.waitForTimeout(wait);
}

function getNextPlayer(){
    if(pageTurnIndex == 0){
        return 1;
    }

    return 0;
}

async function getTdFromPage(page, index){
    let td = await page.$("td[data-cellid='" + index + "']");

    return td;
}







async function launchTask1(){
    const browser = await puppeteer.launch({
        headless: "new"
    });
    const browser2 = await puppeteer.launch({
        headless: "new"
    });

    let browsers = Array();
    browsers.push(browser);
    browsers.push(browser2);
    let pages = Array();

    let p1Page = await browser.newPage();
    pages.push(p1Page);
    await p1Page.goto('http://localhost:' + serverPort);


    let p2Page = await browser2.newPage();
    pages.push(p2Page);
    await p2Page.goto('http://localhost:' + serverPort);

  

   

    let playerIndex = 1;
    let page = pages[0];
    let inputElement = await page.$('#nick_1');
    let inputColor = await page.$("#color_1");
    let submitBtn = await page.$("button[type='submit']");
    let errorMsg = await page.$("#errorMsg");
    



    //Setup test 1
    await inputElement.type('P' + playerIndex);
    await page.evaluate((inputSelector) => {
        document.querySelector(inputSelector).value = '#F6F6F6';
    }, "#color_1");

    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    //Eval test 1
    let errorText = await page.evaluate((errSelector) => {
        let errEl = document.querySelector(errSelector);
        if(errEl == null){
            return "";
        }
        return document.querySelector(errSelector).textContent;
    }, "#errorMsg");

    
    if(errorText.trim() == ""){
        addError(errors, 0, "Player Name", "Fanns inget felmeddelande när en spelare hade ett namn på minre än 3 tecken");
    }
        

    //Setup test 2
    let client = await page.target().createCDPSession()		
    await client.send('Network.clearBrowserCookies')

    await page.goto('http://localhost:' + serverPort);

    //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    inputElement = await page.$('#nick_1');
    inputColor = await page.$("#color_1");
    submitBtn = await page.$("button[type='submit']");
    errorMsg = await page.$("#errorMsg");

    await inputElement.type('Player' + playerIndex);
    await page.evaluate((inputSelector) => {
        document.querySelector(inputSelector).value = '#FFFFFF';
    }, "#color_1");

    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    //Eval test 2
    errorText = await page.evaluate((errSelector) => {
    let errEl = document.querySelector(errSelector);
    if(errEl == null){
        return "";
    }
    return errEl.textContent;
    }, "#errorMsg");


    if(errorText.trim() == ""){
        addError(errors, 1, "Player Color", "Fanns inget felmeddelande när en spelare hade svart eller vit färg");
    }
    

    

    playerIndex = 1;
    for(let page of pages){
        client = await page.target().createCDPSession()		
        await client.send('Network.clearBrowserCookies')

        await page.goto('http://localhost:' + serverPort);

        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        inputElement = await page.$('#nick_1');
        inputColor = await page.$("#color_1");
        submitBtn = await page.$("button[type='submit']");
        errorMsg = await page.$("#errorMsg");

        await page.evaluate((inputSelector) => {
            document.querySelector(inputSelector).innerHTML = '';
        }, "#errorMsg");

        await inputElement.type('Player');
        await page.evaluate((inputSelector) => {
            document.querySelector(inputSelector).value = '#F6F6F6';
        }, "#color_1");

        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        if(page == pages[1]){
            //Eval test 2
            let sameErrorText = await page.evaluate((errSelector) => {
                let errEl = document.querySelector(errSelector);
                if(errEl == null){
                    return "";
                }
                return errEl.textContent;
            }, "#errorMsg");
    
            if(sameErrorText.trim() == ""){
                addError(errors, 3, "Player Same name", "Det finns inget felmeddelande när båda spelarna hade samma namn");
            }
        }
       
    }

    playerIndex = 1;
    for(let page of pages){
        client = await page.target().createCDPSession()		
        await client.send('Network.clearBrowserCookies')

        await page.goto('http://localhost:' + serverPort);

        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        inputElement = await page.$('#nick_1');
        inputColor = await page.$("#color_1");
        submitBtn = await page.$("button[type='submit']");
        errorMsg = await page.$("#errorMsg");

        await page.evaluate((inputSelector) => {
            document.querySelector(inputSelector).innerHTML = '';
        }, "#errorMsg");

        await inputElement.type('Player ' + playerIndex);
        await page.evaluate((inputSelector) => {
            document.querySelector(inputSelector).value = '#F6F6F6';
        }, "#color_1");

        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        //Eval test 2
        errorText = await page.evaluate((errSelector) => {
            let errEl = document.querySelector(errSelector);
            if(errEl == null){
                return "";
            }
            return errEl.textContent;
        }, "#errorMsg");


        if(errorText.trim() == ""){
            addError(errors, 4, "Player Same color", "Det finns inget felmeddelande när båda spelarna hade samma färg");
        }
    }



    playerIndex = 1;
    for(let page of pages){
        client = await page.target().createCDPSession()		
        await client.send('Network.clearBrowserCookies')

        await page.goto('http://localhost:' + serverPort);

        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        inputElement = await page.$('#nick_1');
        inputColor = await page.$("#color_1");
        submitBtn = await page.$("button[type='submit']");
        errorMsg = await page.$("#errorMsg");

        await page.evaluate((inputSelector) => {
            document.querySelector(inputSelector).innerHTML = '';
        }, "#errorMsg");

        await inputElement.type('ThePlayer ' + playerIndex);
        await page.evaluate((inputSelector, playerIndex) => {
            let color = "#F1F1F1";
            if(playerIndex == 2){
                color = "#c30000";
            }
            document.querySelector(inputSelector).value = color;
        }, "#color_1", playerIndex);

        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        //Eval test 2
        errorText = await page.evaluate((errSelector) => {
            let errEl = document.querySelector(errSelector);
            if(errEl == null){
                return "";
            }
            return errEl.textContent;
        }, "#errorMsg");


        if(errorText.trim() != ""){
            addError(errors, 5, "Cannot start", "Det blev ett error-meddelande när spelet skulle starta");
        }
        playerIndex++;
    }


    playerIndex = 1;
    let cookieName = false;
    let cookieColor = false;
    for(let page of pages){
        let cookies = await page.cookies();

        // Display cookie names and values
        cookies.forEach(cookie => {
            if(cookie.name == "nickName" && cookie.value != ""){
                cookieName = true;
            }
            if(cookie.name == "color" && cookie.value != ""){
                cookieColor = true;
            }
        });

        if(!cookieName){
            addError(errors, 7, "Cookie nickname", "Det finns ingen kaka som heter nickName eller så har kakan inget värde!");
        }

        if(!cookieColor){
            addError(errors, 8, "Cookie color", "Det finns ingen kaka som heter color eller så har kakan inget värde!");
        }
    }


    playerIndex = 1;
    for(let page of pages){
        await page.goto('http://localhost:' + serverPort + "/reset");
        let cookies = await page.cookies();

        if(cookies.length > 0){
            addError(errors, 9, "Cookies exist", "Det finns fortfarande kakor kvar när man går in på /reset");
        }
        playerIndex++;
    }


    

    // Close the browser
    //await browser.close();

    console.log(errors);

    startFeedbackServer(errors);
}





function addError(errors, id, title, description){
    let exist = errors.some(e => e.id == id);
    if(!exist){
        errors.push({
            id: id,
            title: title,
            description: description
        });
    }    
}




const express = require('express');
const app = express();



function startFeedbackServer(errors){
    let localPort = serverPort + 1;

    process.chdir(autoDirectory);
    const server = app.listen(localPort, () => {
        console.log("Feedback server is running on port: " + localPort);
    });

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    async function openPuppeteer() {
        let browser = await puppeteer.launch({
            headless: false
        });
        let page = await browser.newPage();

        //await page.goto(`http://localhost:${localPort}`);
        await page.goto("http://localhost:" + localPort);

        await page.evaluate((data) => {
            writeFeedback(data);
        }, errors);
    }

    server.on('listening', () => {
        openPuppeteer();
    });
}
