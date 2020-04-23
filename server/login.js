var schema = require('duck-type').create();
var srs = require('secure-random-string');

let LoginCallbacks = function (rooms) {

    let checkUsername = (username) => {
        // check username validity
        if (username.length === 0) {
            return false;
        } else if (username.length < 3 || username.length > 16) {
            return false;
        } else if (username.search(/^[A-Za-z0-9 ]+$/) === -1) {
            return false;
        } else if (username.search(/ {2}/) !== -1) {
            return false;
        } else if (username[0] === ' ' || username[username.length - 1] === ' ') {
            return false;
        }

        return true;
    }

    this.submitJoin = (token, data, registry) => {

        // check packet format
        try {

            schema.assert(data).is({
                username: String,
                roomCode: String
            });

        } catch (e) {
            console.warn("WARNING: Invalid submitJoin packet received.");
            return {
                accepted: false,
                response: {
                    modal: "genericError"
                }
            };
        }

        var username = data.username;
        var roomCode = data.roomCode;
        usernameValidity = checkUsername(username);

        var roomCodeValidity = (roomCode.search(/^[A-Za-z]{3} [A-Za-z]{3}$/) !== 0);

        if (!usernameValidity && roomCodeValidity) {
            return {
                accepted: false,
                response: {
                    username: "serverError"
                }
            };
        }

        if (usernameValidity === "" && !roomCodeValidity) {
            return {
                accepted: false,
                response: {
                    roomCode: "serverError"
                }
            };
        }

        if (usernameValidity && roomCodeValidity) {
            return {
                accepted: false,
                response: {
                    roomCode: "serverError",
                    username: "serverError"
                }
            };
        }


        let retval = rooms.joinRoom(token, roomCode, username, registry);
        if (retval.accepted) {
            registry.setCallbacks(token, 'waiting');
        }
        return retval;

    }

    this.submitCreate = (token, data, registry) => {

        // check packet format
        try {

            schema.assert(data).is({
                username: String,
                game: String
            });

        } catch (e) {
            console.warn("WARNING: Invalid submitJoin packet received.");
            return {
                accepted: false,
                response: {
                    modal: "genericError"
                }
            };
        }

        let username = data.username;
        usernameValidity = checkUsername(username);

        if (!usernameValidity) {
            return {
                accepted: false,
                response: {
                    username: "serverError"
                }
            };
        }


        let retval = rooms.createRoom(token, data.game, username, registry);
        if (retval.accepted) {
            registry.setCallbacks(token, 'waiting');
        }
        return retval;

    };

    this.disconnect = (token, data, registry) => {
        rooms.onDisconnect(token, registry);
    };

    this.connect = (token, data, registry) => {
        registry.send(token, 'ensure_location', '/', () => {
        });
        registry.setToken(token, 'public', srs({alphanumeric: true}));

    };

    this.reconnect = (token, data, registry) => {
        registry.send(token, 'ensure_location', '/', () => {
        });
    };

}
module.exports = LoginCallbacks;