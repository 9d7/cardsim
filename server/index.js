const srs = require('secure-random-string');

const main = (io, userTokens, userSessions) => {

    io.on('connect', (socket) => {

        var address = socket.handshake.address;

        client.on('register', function (token) {

            if (typeof (token) != "string") {
                return [false, "invalid-token"];
            } else {
                if (!userTokens.hasToken(token)) {
                    token = srs();
                }

                userTokens.update(socket.id, token);
                userSessions.insert(token, 'ip', address.address);
                return [true, token]

            }

        });

    });

}
module.exports = main;