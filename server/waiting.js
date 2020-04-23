var schema = require('duck-type').create()

let registryCallbacks = function (rooms) {

    this.connect = (token, data, registry) => {
        console.log("WARNING: User connected into non-default callbacks");
    }

    this.disconnect = (token, data, registry) => {
        rooms.onDisconnect(token, registry);
    }

    // user entered the room OR refreshed
    this.reconnect = (token, data, registry) => {
        registry.send(token, 'ensure_location', '/waiting/', () => {
        });
    }

    this.getData = (token, data, registry) => {

        console.log("hi");

        let roomID = registry.getRoom(token);
        let room = rooms.getRoom(roomID);
        if (room === null) {
            console.log("WARNING: User reconnected in waiting phase without room");
            return;
        }

        if (!rooms.roomTypes.hasOwnProperty(room.game)) {
            console.log("WARNING: Room does not know about game " + room.game);
            return;
        }

        let game = rooms.roomTypes[room.game];

        let returnPacket = {
            code: room.code,
            name: game.name,
            max_players: game.max_players,
            min_players: game.min_players,
            members: rooms.getUsernames(registry, roomID)
        }
        console.log(returnPacket);

        return returnPacket;

    }

    this.leaveRoom = (token, data, registry) => {

    }

}

let roomCallbacks = function () {

    this.join = (room, token, registry, rooms) => {

        rooms.send(room, 'userUpdate', {
            members: rooms.getUsernames(registry, room)
        });

    }

    this.leave = (room, token, registry, rooms) => {

        rooms.send(room, 'userUpdate', {
            members: rooms.getUsernames(registry, room)
        });

    }

    this.disband = (room, token, registry, rooms) => {

    }

}

module.exports.registry = registryCallbacks;
module.exports.rooms = roomCallbacks;