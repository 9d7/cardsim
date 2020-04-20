(function () {

    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const io = require('socket.io')(server);
    const path = require('path');
    const serveStatic = require('serve-static');



    app.use(serveStatic('client/home'))
    app.use(serveStatic('client'));

    // https://stackoverflow.com/questions/21070836/
    // how-can-i-create-a-two-way-mapping-in-javascript-or-some-other-way-to-swap-out
    function TokenMap() {
        sessionsToTokens = {};
        tokensToSessions = {};
    }
    TokenMap.prototype.getToken = (session) => { return this.sessionsToTokens[session]; }
    TokenMap.prototype.getSession = (token) => { return this.tokensToSessions[token]; }
    TokenMap.prototype.hasSession = (session) => { return this.sessionsToTokens.hasOwnProperty(session); }
    TokenMap.prototype.hasToken = (token) => { return this.tokensToSessions.hasOwnProperty(token); }
    TokenMap.prototype.update = (session, token) => {
        this.sessionsToTokens[session] = token;
        this.tokensToSessions[token] = session;
    }
    TokenMap.prototype.remove = (token) => {
        if (tokensToSessions.hasOwnProperty(token)) {
            let session = tokensToSessions[token];
            delete tokensToSessions[token];
            delete sessionsToTokens[session];
        }
    }


    var userTokens = new TokenMap();
    var rooms = {};
    var userSessions = {};
    userSessions.prototype.insert = (token, key, val) => {
        if (!this.hasOwnProperty(token)) {
            this[token] = {};
        }
        this[token][key] = val;
    }

    function clearAll(token) {
        delete userSessions[token];
        userTokens.remove(token);

        // rooms.remove(token)
    }

    userSessions.prototype.watchdog = (token, time) => {
        if (!this.hasOwnProperty(token)) {
            return;
        }
        if (this[token].hasOwnProperty('watchdog')) {
            clearTimeout(this[token].watchdog);
        }
        this[token].watchdog = setTimeout(function(){ clearAll(token); }, time);
    }


    server.listen(5000);


}());