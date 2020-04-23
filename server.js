const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const serveStatic = require('serve-static');
const Registry = require('./server/registry');
const Callbacks = require('./server/login');
const Rooms = require('./server/rooms');
const Waiting = require('./server/waiting');

app.use(serveStatic('client/home'))
app.use(serveStatic('client'));

server.listen(5000);

var rooms = new Rooms(new Waiting.rooms());

rooms.registerRoomType('secret', {
    max_players: 10,
    min_players: 5,
    name: 'Secret Hitler'
})

var registry = new Registry(
    io,
    1000,
    20,
    60 * 5 * 1000,
    10 * 1000,
    new Callbacks(rooms, new Waiting.registry(rooms))
);

