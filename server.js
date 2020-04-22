(function () {

    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const io = require('socket.io')(server);
    const serveStatic = require('serve-static');
    const Registry = require('./server/registry');
    const Callbacks = require('./server/login');
    const Rooms = require('./server/rooms');


    app.use(serveStatic('client/home'))
    app.use(serveStatic('client'));

    server.listen(5000);

    let readout = (token, data, reg) => {
        console.log(reg.sessionToToken);
        console.log(reg.tokenToSession);
        console.log(reg.tokenCallbacks);
        console.log(reg.tokenRooms);
        console.log(reg.tokenToIP);
        console.log(reg.ipBuckets);
        console.log(reg.killTimers);
    }

    let rooms = new Rooms();
    let registry = new Registry(
        io,
        1000,
        20,
        60 * 5 * 1000,
        10 * 1000,
        new Callbacks(rooms)
    );


}());