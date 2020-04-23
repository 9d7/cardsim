var schema = require('duck-type').create()

let registryCallbacks = function (rooms) {

    let _setReady = (token, isReady, room, registry) => {

        registry.sendRoom(room, 'ready', {
            member: registry.getToken(token, 'public'),
            isReady: isReady
        });
        registry.setToken(token, 'isReady', isReady);
    }

    let _getUsers = (room, rooms, registry) => {
        let members = rooms.getMembers(room);
        if (room === null) {
            console.warn("WARNING: _getUsers called on invalid room");

        }


        return Array.from(members).map(
            (memberToken) => {
                return {
                    username: registry.getToken(memberToken, 'name'),
                    public: registry.getToken(memberToken, 'public'),
                    ready: registry.getToken(memberToken, 'isReady')
                };
            }
        );
    }

    this.connect = (token, data, registry) => {
        console.warn("WARNING: User connected into non-default callbacks");
    }

    this.disconnect = (token, data, registry) => {
        rooms.onDisconnect(token, registry);
    }

    // user entered the room OR refreshed
    this.reconnect = (token, data, registry) => {
        registry.send(token, 'ensure_location', '/waiting/', () => {
        });
        _setReady(token, false, registry.getRoom(token), registry);
    }

    this.getData = (token, data, registry) => {

        let roomID = registry.getRoom(token);
        let room = rooms.getRoom(roomID);
        if (room === null) {
            console.warn("WARNING: User reconnected in waiting phase without room");
            return;
        }

        if (!rooms.roomTypes.hasOwnProperty(room.game)) {
            console.warn("WARNING: Room does not know about game " + room.game);
            return;
        }

        let game = rooms.roomTypes[room.game];

        return {
            code: room.code,
            name: game.name,
            max_players: game.max_players,
            min_players: game.min_players,
            members: _getUsers(roomID, rooms, registry)
        };

    }

    this.leaveRoom = (token, data, registry) => {
        rooms.leaveRoom(token, registry);
        return 1;
    }

    this.ready = (token, data, registry) => {

        try {
            schema.assert(data).is({isReady: Boolean});
        } catch (e) {
            console.warn("WARNING: Invalid packet type sent on ready");
        }

        let roomID = registry.getRoom(token);
        if (roomID === null) {
            console.warn("WARNING: User has waiting callbacks while outside of room");
            return;
        }


        _setReady(token, data.isReady, roomID, registry);

        if (data.isReady) {
            let allReady = true;
            for (const member of rooms.getMembers(roomID)) {
                let token = registry.getToken(member, 'isReady');
                if (token === null || token === undefined || token === false) {
                    allReady = false;
                    break;
                }
            }

            if (allReady) {
                rooms.ready(roomID, registry);
            }
        }

        return 1;

    }

}

let roomCallbacks = function () {

    let _getUsers = (room, rooms, registry) => {
        let members = rooms.getMembers(room);
        if (room === null) {
            console.warn("WARNING: _getUsers called on invalid room");

        }
        return Array.from(members).map(
            (memberToken) => {
                return {
                    username: registry.getToken(memberToken, 'name'),
                    public: registry.getToken(memberToken, 'public'),
                    ready: registry.getToken(memberToken, 'isReady')
                };
            }
        );
    }

    this.join = (room, token, registry, rooms) => {
        registry.sendRoom(room, 'userUpdate', {
            members: _getUsers(room, rooms, registry)
        });

    }

    this.leave = (room, token, registry, rooms) => {
        console.log("received");
        registry.sendRoom(room, 'userUpdate', {
            members: _getUsers(room, rooms, registry)
        });

        let roomObj = rooms.getRoom(room);
        if (roomObj === null) {
            console.warn("WARNING: User reconnected in waiting phase without room");
            return;
        }

        if (!rooms.roomTypes.hasOwnProperty(roomObj.game)) {
            console.warn("WARNING: Room does not know about game " + roomObj.game);
            return;
        }

        if (roomObj.members.size < rooms.roomTypes[roomObj.game].min_players) {
            roomObj.members.forEach(x => registry.setToken(x, 'isReady', false));
        }

    }

    this.disband = (room, token, registry, rooms) => {

    }

}

module.exports.registry = registryCallbacks;
module.exports.rooms = roomCallbacks;