"use strict";

const express = require("express");
const jsDOM = require("jsdom");
const cookieParser = require("cookie-parser");
const globalObject = require("./servermodules/game-modul.js");
const fs = require("fs");
const { parse } = require("path");

const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(cookieParser());
app.use("/public", express.static("static"));
app.use(express.urlencoded({ extended: true }));

//app.listen(3000, () => {
//    console.log('Server started on http://localhost:3000');
//});

http.listen(3000, () => {
    console.log("Server started on http://localhost:3000");
});

function parseHeaderCookies(cookies) {
    const cookieObj = {};
    const cookieArr = cookies.split(";");
    cookieArr.forEach((cookie) => {
        const [key, value] = cookie.split("=");
        cookieObj[key.trim()] = value;
    });
    return cookieObj;
}

function timeout() {
    if (globalObject.currentPlayer === globalObject.playerOneSocketId) {
        io.to(globalObject.playerOneSocketId).emit('timeout', null);
        io.to(globalObject.playerTwoSocketId).emit('yourMove', null);
        globalObject.currentPlayer = globalObject.playerTwoSocketId;
    } else {
        io.to(globalObject.playerTwoSocketId).emit('timeout', null);
        io.to(globalObject.playerOneSocketId).emit('yourMove', null);
        globalObject.currentPlayer = globalObject.playerOneSocketId;
    }

    clearTimeout(globalObject.timerId);
    globalObject.timerId = setTimeout(timeout, 5000);
}

io.on('connection', (socket) => {
    console.log('a user connected');
    // Parse cookies using the middleware
    const cookies = parseHeaderCookies(socket.request.headers.cookie);

    if (cookies.nickName && cookies.color) {
        if (globalObject.playerOneSocketId && globalObject.playerTwoSocketId) {
            console.log('Redan två spelare anslutna!')
            socket.disconnect(true);
        }

        if (globalObject.playerOneNick === cookies.nickName) {
            globalObject.playerOneSocketId = socket.id;
        } else if (globalObject.playerTwoNick === cookies.nickName) {
            globalObject.playerTwoSocketId = socket.id;

            globalObject.resetGameArea();
            io.to(globalObject.playerOneSocketId).emit('newGame', {opponentNick: globalObject.playerTwoNick, opponentColor: globalObject.playerTwoColor, myColor: globalObject.playerOneColor});
            io.to(globalObject.playerTwoSocketId).emit('newGame', {opponentNick: globalObject.playerOneNick, opponentColor: globalObject.playerOneColor, myColor: globalObject.playerTwoColor});

            globalObject.currentPlayer = globalObject.playerOneSocketId;
            io.to(globalObject.playerOneSocketId).emit('yourMove', null);
            globalObject.timerId = setTimeout(timeout, 5000);
        }
    } else {
        console.log('Kakorna saknas!')
        socket.disconnect(true);
    }

    socket.on('newMove', (data) => {
        if (socket.id === globalObject.currentPlayer) {
            clearTimeout(globalObject.timerId);
            if (globalObject.currentPlayer === globalObject.playerOneSocketId) {
                globalObject.gameArea[data.cellId] = 1;
                globalObject.currentPlayer = globalObject.playerTwoSocketId;
                io.to(globalObject.playerTwoSocketId).emit('yourMove', {cellId: data.cellId});
            } else {
                globalObject.gameArea[data.cellId] = 2;
                globalObject.currentPlayer = globalObject.playerOneSocketId;
                io.to(globalObject.playerOneSocketId).emit('yourMove', {cellId: data.cellId});
            }
            globalObject.timerId = setTimeout(timeout, 5000);

            const winner = globalObject.checkForWinner();

            if (winner === 1) {
                io.to(globalObject.playerOneSocketId).emit('gameover', `${globalObject.playerOneNick} vann!`);
                io.to(globalObject.playerTwoSocketId).emit('gameover', `${globalObject.playerOneNick} vann!`);
            } else if (winner === 2) {
                io.to(globalObject.playerOneSocketId).emit('gameover', `${globalObject.playerTwoNick} vann!`);
                io.to(globalObject.playerTwoSocketId).emit('gameover', `${globalObject.playerTwoNick} vann!`);
            } else if (winner === 3) {
                io.to(globalObject.playerOneSocketId).emit('gameover', 'Oavgjort!');
                io.to(globalObject.playerTwoSocketId).emit('gameover', 'Oavgjort!');
            }

            if (winner !== 0) { // Resetta spelet för en ny runda
                globalObject.resetGameArea();
                clearTimeout(globalObject.timerId);
                globalObject.playerOneNick = null;
                globalObject.playerOneColor = null;
                globalObject.playerOneSocketId = null;
                globalObject.playerTwoNick = null;
                globalObject.playerTwoColor = null;
                globalObject.playerTwoSocketId = null;
                globalObject.currentPlayer = null;
                globalObject.timerId = null;
            }
        }
    });
});

io.on("newMove", (data) => {
    console.log("newMove", data);
});

app.get("/", (req, res) => {
    if (req.cookies.nickName && req.cookies.color) {
        res.sendFile(__dirname + "/static/html/index.html");
    } else {
        res.sendFile(__dirname + "/static/html/loggain.html");
    }
});

app.get("/reset", (req, res) => {
    if (req.cookies.nickName) {
        res.clearCookie("nickName");
        if (globalObject.playerOneNick === req.cookies.nickName) {
            globalObject.playerOneNick = null;
        } else if (globalObject.playerTwoNick === req.cookies.nickName) {
            globalObject.playerTwoNick = null;
        }
    }
    if (req.cookies.color) {
        res.clearCookie("color");
        if (globalObject.playerOneColor === req.cookies.color) {
            globalObject.playerOneColor = null;
        } else if (globalObject.playerTwoColor === req.cookies.color) {
            globalObject.playerTwoColor = null;
        }
    }
    res.redirect("/");
});

app.post("/", (req, res) => {
    try {
        if (req.body.nick_1 === undefined) {
            throw new Error("Nickname saknas!");
        }

        if (req.body.color_1 === undefined) {
            throw new Error("Färg saknas!");
        }

        if (req.body.nick_1.length < 3) {
            throw new Error("Nickname skall vara minst tre tecken långt!");
        }

        if (req.body.color_1.length !== 7) {
            throw new Error("Färg skall innehålla sju tecken!");
        }

        if (req.body.color_1 === "#000000" || req.body.color_1 === "#ffffff") {
            throw new Error("Ogiltig färg!");
        }

        if (!globalObject.playerOneColor) {
            globalObject.playerOneNick = req.body.nick_1;
            globalObject.playerOneColor = req.body.color_1;
        } else {
            if (globalObject.playerOneNick === req.body.nick_1) {
                throw new Error("Nickname redan taget!");
            }
            if (globalObject.playerOneColor === req.body.color_1) {
                throw new Error("Färg redan tagen!");
            }
            globalObject.playerTwoNick = req.body.nick_1;
            globalObject.playerTwoColor = req.body.color_1;
        }

        // Cookie max age 2 hours, server only
        res.cookie("nickName", req.body.nick_1, {
            maxAge: 7200000,
            httpOnly: true,
        });
        res.cookie("color", req.body.color_1, {
            maxAge: 7200000,
            httpOnly: true,
        });
        res.redirect("/");
    } catch (error) {
        fs.readFile(
            __dirname + "/static/html/loggain.html",
            "utf8",
            (err, data) => {
                if (err) {
                    res.status(500).send("Internal server error");
                } else {
                    const dom = new jsDOM.JSDOM(data);
                    const document = dom.window.document;
                    const errorDiv = document.querySelector("#errorMsg");
                    errorDiv.textContent = error.message;
                    const colorInput = document.querySelector("#color_1");
                    colorInput.setAttribute("value", req.body.color_1);
                    const nickInput = document.querySelector("#nick_1");
                    nickInput.setAttribute("value", req.body.nick_1);
                    res.send(dom.serialize());
                }
            }
        );
    }
});
