'use strict';

const express = require('express');
const jsDOM = require('jsdom');
const cookieParser = require('cookie-parser');
const globalObject = require('./servermodules/game-modul.js');
const fs = require('fs');

const app = express();
app.use(cookieParser());
app.use(express.static('/static'));
app.use(express.urlencoded({ extended: true }));

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});

app.get('/', (req, res) => {
    if (req.cookies.nickName && req.cookies.color) {
        res.sendFile(__dirname + '/static/html/index.html');
    } else {
        res.sendFile(__dirname + '/static/html/loggain.html');
    }
});

app.get('/reset', (req, res) => {
    if (req.cookies.nickName) {
        res.clearCookie('nickName');
        if (globalObject.playerOneNick === req.cookies.nickName) {
            globalObject.playerOneNick = null;
        } else if (globalObject.playerTwoNick === req.cookies.nickName) {
            globalObject.playerTwoNick = null;
        }
    }
    if (req.cookies.color) {
        res.clearCookie('color');
        if (globalObject.playerOneColor === req.cookies.color) {
            globalObject.playerOneColor = null;
        } else if (globalObject.playerTwoColor === req.cookies.color) {
            globalObject.playerTwoColor = null;
        }
    }
    res.redirect('/');
});

app.post('/', (req, res) => {
    try {
        if (req.body.nick_1 === undefined) {
            throw new Error('Nickname saknas!');
        }
    
        if (req.body.color_1 === undefined) {
            throw new Error('Färg saknas!');
        }
    
        if (req.body.nick_1.length < 3) {
            throw new Error('Nickname skall vara minst tre tecken långt!');
        }
    
        if (req.body.color_1.length !== 7) {
            throw new Error('Färg skall innehålla sju tecken!');
        }
    
        if (req.body.color_1 === '#000000' || req.body.color_1 === '#ffffff') {
            throw new Error('Ogiltig färg!');
        }
    
        if (!globalObject.playerOneColor) {
            globalObject.playerOneNick = req.body.nick_1;
            globalObject.playerOneColor = req.body.color_1;
        } else {
            if (globalObject.playerOneNick === req.body.nick_1) {
                throw new Error('Nickname redan taget!');
            }
            if (globalObject.playerOneColor === req.body.color_1) {
                throw new Error('Färg redan tagen!');
            }
            globalObject.playerTwoNick = req.body.nick_1;
            globalObject.playerTwoColor = req.body.color_1;
        }
    
        // Cookie max age 2 hours, server only
        res.cookie('nickName', req.body.nick_1, { maxAge: 7200000, httpOnly: true });
        res.cookie('color', req.body.color_1, { maxAge: 7200000, httpOnly: true });
        console.log('Cookies set');
        res.redirect('/');
    } catch (error) {
        fs.readFile(__dirname + '/static/html/loggain.html', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal server error');
            } else {
                const dom = new jsDOM.JSDOM(data);
                const document = dom.window.document;
                const errorDiv = document.querySelector('#errorMsg');
                errorDiv.textContent = error.message;
                const colorInput = document.querySelector('#color_1');
                console.log(req.body.color_1);
                colorInput.value = req.body.color_1;
                const nickInput = document.querySelector('#nick_1');
                console.log(typeof req.body.nick_1);
                console.log(req.body.nick_1);
                nickInput.value = req.body.nick_1;
                res.send(dom.serialize());
            }
        });
    }
});