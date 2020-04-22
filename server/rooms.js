let Rooms = function () {

    this.roomCodes = {}
    this.rooms = {}
    this.roomTypes = {}

    this.registerRoomType = (game, max_players, data) => {
        this.roomTypes[game] = {
            max_players: max_players,
            data: data
        }
    };

    /**
     * Creates a room.
     * @param token             The token of the user that created the room.
     * @param game              The name of the game the room is meant to play.
     * @param username          The username of the user that created the room.
     * @param registry          The registry.
     */
    this.createRoom = (token, game, username, registry) => {

        if (!this.roomCodes.hasOwnProperty(game)) {
            return "gameDoesNotExist";
        }






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

        let room = roomCodes[code];

        // didn't find roomID
        if (!this.rooms.hasOwnProperty(room)) {
            console.log("WARNING: Room code does not have matching room.");
            return noRoomFound;
        }

        // get all usernames in room
        let members = Array.from(this.getMembers(room)).map(
            (memberToken) => {
                let membName = registry.getToken(memberToken, 'username');
                if (membName !== null) {
                    membName = membName.toLowerCase();
                }
                return membName;
            }
        );

        // username found, no duplicates
        if (members.includes(username)) {
            return {
                accepted: false,
                response: {
                    username: "usernameUsed",
                }
            };
        }

        // success! join the room
        registry.setRoom(token, room);


        return {
            accepted: true
        };

    }

    this.leaveRoom = (token, registry) => {

    }

    this.getMembers = (id) => {

    }

    this.send = (id, event, data, callback) => {

    }



}
module.exports = Rooms;