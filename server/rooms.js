const fs = require('fs');
const srs = require('secure-random-string');

let Rooms = function (defaultCallbacks) {

    this.roomCodes = {};
    this.rooms = {};
    this.roomTypes = {};
    this.defaultCallbacks = defaultCallbacks;

    /**
     * room type:
     * {
     *     game: String,
     *     code: String,
     *     members: Set,
     *     inGame: boolean
     * }
     *
     * game type:
     * {
     *     max_players: Number,
     *     game_callbacks: {
     *         connect:
     *         disconnect:
     *         reconnect:
     *         roomJoin:
     *         roomLeave:
     *     }
     *
     * }
     */
    this._getCallback = (room, event, token, registry) => {


        if (!this.rooms.hasOwnProperty(room)){
            console.log("WARNING: Callback requested for invalid room.");
            return;
        }

        let roomObj = this.rooms[room];

        if (room.inGame) {
            let callbacks = this.roomTypes[roomObj.game];

            if (this.roomTypes[roomObj.game].hasOwnProperty(event)) {
                return this.defaultCallbacks[event](room, token, registry, this);
            }
        } else {
            if (this.defaultCallbacks.hasOwnProperty(event)) {
                return this.defaultCallbacks[event](room, token, registry, this);
            }
        }

    }

    this.registerRoomType = (game, data) => {
        this.roomTypes[game] = data;
    };

    /**
     * Callback to use on user disconnect.
     * @param token
     * @param registry
     */
    this.onDisconnect = (token, registry) => {
        this.leaveRoom(token, registry);
    }

    /**
     * Creates a room.
     * @param token             The token of the user that created the room.
     * @param game              The name of the game the room is meant to play.
     * @param username          The username of the user that created the room.
     * @param registry          The registry.
     */
    this.createRoom = (token, game, username, registry) => {

        if (!this.roomTypes.hasOwnProperty(game)) {
            console.log("WARNING: Room was created with unsupported game \"" + game + "\"");
            return {
                accepted: false,
                response: {
                    modal: "genericError"
                }
            };
        }

        // if user is in a room, force them to leave
        this.leaveRoom(token, registry);

        let success = false;
        for (let i = 0; i < 100; i++) {
            let numWords = this.words.length / (this.word_len + 1);
            console.log(numWords);
            let rand1 = Math.floor(Math.random() * numWords) * (this.word_len + 1);
            let rand2 = Math.floor(Math.random() * numWords) * (this.word_len + 1);

            var code = this.words.slice(rand1, rand1 + this.word_len) + " " +
                this.words.slice(rand2, rand2 + this.word_len);

            if (!this.roomCodes.hasOwnProperty(code)) {
                success = true;
                break;
            }
        }

        if (!success) {
            return {
                accepted: false,
                response: {
                    modal: "noRoomGeneration"
                }
            };
        }

        let id = srs();

        this.roomCodes[code] = id;
        this.rooms[id] = {
            game: game,
            code: code,
            members: new Set()
        }

        this.rooms[id].members.add(token);
        registry.setRoom(token, id);
        registry.setToken(token, 'name', username);
        this._getCallback(id, 'join', token, registry);

        return {accepted: true};




    }

    this.getUsernames = (registry, room) => {
        let members = this.getMembers(room);
        if (room === null) {
            console.log("WARNING: getUsernames called on invalid room");

        }
        return Array.from(members).map(
            (memberToken) => {
                let membName = registry.getToken(memberToken, 'name');
                if (membName !== null) {
                    membName = membName.toLowerCase();
                }
                return membName;
            }
        );
    }

    this.joinRoom = (token, code, username, registry) => {

        let noRoomFound = {
            accepted: false,
            response: {
                roomCode: "noRoomFound"
            }
        };

        // couldn't find code
        code = code.toLowerCase();
        if (!this.roomCodes.hasOwnProperty(code)) {
            return noRoomFound;
        }

        let room = this.roomCodes[code];

        // didn't find roomID
        if (!this.rooms.hasOwnProperty(room)) {
            console.log("WARNING: Room code does not have matching room.");
            return noRoomFound;
        }

        // check if room is full
        if (this.rooms[room].members.size >=
            this.roomTypes[this.rooms[room].game].max_players) {
            return {
                accepted: false,
                response: {
                    roomCode: "roomFull"
                }
            };
        }

        // get all usernames in room
        let members = Array.from(this.getMembers(room)).map(
            (memberToken) => {
                let membName = registry.getToken(memberToken, 'name');
                if (membName !== null) {
                    membName = membName.toLowerCase();
                }
                return membName;
            }
        );

        // username found, no duplicates
        if (members.includes(username.toLowerCase())) {
            return {
                accepted: false,
                response: {
                    username: "usernameUsed",
                }
            };
        }

        // success! join the room
        this.rooms[room].members.add(token);
        registry.setRoom(token, room);
        registry.setToken(token, 'name', username);
        this._getCallback(room, 'join', token, registry);

        console.log(this.rooms);
        console.log(this.roomCodes);

        return {
            accepted: true
        };

    }

    this.leaveRoom = (token, registry) => {

        var room = registry.getRoom(token);

        if (room === null) {
            return;
        }

        if (!this.rooms.hasOwnProperty(room)) {
            console.log("WARNING: in leaveRoom, User had room that was not in room list.");
            return;
        }


        this._getCallback(room, 'leaving', token, registry);
        this.rooms[room].members.delete(token);
        registry.leaveRoom(token);
        this._getCallback(room, 'leave', token, registry);

        if (this.rooms[room].size === 0) {
            // disband room
            this._getCallback(room, 'disband', null, registry);
            var code = this.rooms[room].code;
            delete this.roomCodes[code];
            delete this.rooms[room];

        }


    }

    this.getMembers = (id) => {
        if (!this.rooms.hasOwnProperty(id)) {
            return new Set()
        } else {
            return this.rooms[id].members;
        }
    }

    this.send = (id, event, data, callback) => {

    }

    this.getRoom = (room) => {

        if (!this.rooms.hasOwnProperty(room)) {
            console.log("WARNING: in getRoom, User had room that was not in room list.");
            return null;
        }

        return this.rooms[room];
    }


}

fs.readFile('./resources/words.txt', (err, data) => {
    if (err) throw err;

    Rooms.prototype.words = data;

});
Rooms.prototype.word_len = 3;

module.exports = Rooms;