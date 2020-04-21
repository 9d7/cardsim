(function () {

    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const io = require('socket.io')(server);
    const path = require('path');
    const serveStatic = require('serve-static');
    const Registry = require('./server/registry');



    app.use(serveStatic('client/home'))
    app.use(serveStatic('client'));

    server.listen(5000);

    readout = (token, data, reg) => {
        console.log(reg.sessionToToken);
        console.log(reg.tokenToSession);
        console.log(reg.tokenCallbacks);
        console.log(reg.tokenRooms);
        console.log(reg.tokenToIP);
        console.log(reg.ipBuckets);
        console.log(reg.killTimers);
    }

    registry = new Registry(
        io,
        500,
        20,
        60 * 5 * 1000,
        10 * 1000,
        {
            connect: (token, data, reg) => {
                console.log("CONNECT", token, data);
                readout(token, data, reg);
            },
            disconnect: (token, data, reg) => {
                console.log("DISCONNECT", token, data);
                readout(token, data, reg);
            },
            reconnect: (token, data, reg) => {
                console.log("RECONNECT", token, data);
                readout(token, data, reg);
            }

        });


}());