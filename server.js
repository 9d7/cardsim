(function() {

    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const io = require('socket.io')(server);
    const path = require('path');
    const serveStatic = require('serve-static');


    app.use(serveStatic('client', {dotfiles: "allow"}));


    server.listen(5000);


}());