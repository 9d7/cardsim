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

        // error for issues with packet format
        var genericError = {
            accepted: false,
            response: {
                modal: "genericError"
            }
        };

        // check packet format
        if (typeof (data) !== 'object') return genericError;

        if (!data.hasOwnProperty('username')) return genericError;
        if (!data.hasOwnProperty('roomCode')) return genericError;

        var username = data[username];
        var roomCode = data[roomCode];

        if (typeof (username) !== 'string') return genericError;
        if (typeof (roomCode) !== 'string') return genericError;

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


        return this.joinRoom(token, roomCode, username, registry);

    }

    this.submitCreate = (token, data, registry) => {

        // error for issues with packet format
        var genericError = {
            accepted: false,
            response: {
                modal: "genericError"
            }
        };

        // check packet format
        if (typeof (data) !== 'object') return genericError;

        if (!data.hasOwnProperty('username')) return genericError;
        if (!data.hasOwnProperty('game')) return genericError;

        var username = data[username];
        var game = data[game];

        if (typeof (username) !== 'string') return genericError;
        if (typeof (game) !== 'string') return genericError;

        usernameValidity = checkUsername(username);

        if (usernameValidity !== "") {
            return {
                accepted: false,
                response: {
                    username: usernameValidity
                }
            };
        }

    };


}
module.exports = LoginCallbacks;