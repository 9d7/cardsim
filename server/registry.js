const srs = require("secure-random-string");

/**
 * @param io                The socket.io instance.
 * @param leakRate          How quickly the leaky-bucket rate limiting will drain.
 *                          Should be >= avg. requests per second.
 * @param maxFill           The maximum capacity the buckets can reach before ignoring incoming events.
 * @param ipClearRate       The buckets will reset after a certain amount of time to prevent leaking memory.
 *                          This is their clear rate. Should be much larger than the average user session time.
 * @param disconnectTime    The amount of time to wait upon user disconnect to delete their token data.
 * @param defaultCallback   When certain events happen regarding the token lifespan (e.g. a token is created,
 *                          a token is destroyed, or a token was disconnected and now must be re-updated), a
 *                          set of callback functions can be registered. defaultCallback provides the default
 *                          values for these callbacks.
 */
let Registry = function (io, leakRate, maxFill, ipClearRate, disconnectTime, defaultCallback) {

    this.sessionToToken = {};
    this.tokenToSession = {};
    this.tokenCallbacks = {};
    this.tokenRooms = {};
    this.rooms = {};
    this.tokenToIP = {};
    this.ipBuckets = {};
    this.killTimers = {};

    this.maxFill = maxFill;
    this.disconnectTime = disconnectTime;
    this.defaultCallback = defaultCallback;
    this.io = io;

    setInterval(function () {
        for (const bucket in this.ipBuckets) {
            if (this.ipBuckets.hasOwnProperty(bucket)) {
                this.ipBuckets[bucket] -= 1
                this.ipBuckets[bucket] = Math.max(this.ipBuckets.bucket, 0);
            }

        }
    }, leakRate);

    setInterval(function () {
        for (const bucket in this.ipBuckets) {
            if (this.ipBuckets.hasOwnProperty(bucket)) {
                if (this.ipBuckets[bucket] === 0) {
                    delete this.ipBuckets[bucket];
                }
            }
        }
    }, ipClearRate);


    let _get_ip = (socket) => {
        return socket.handshake.address;
    };

    this._ip_check = (socket) => {
        let ip = _get_ip(socket);

        if (!this.ipBuckets.hasOwnProperty(ip)) {
            this.ipBuckets[ip] = 1;
        } else {
            this.ipBuckets[ip]++;
        }

        return (this.ipBuckets[ip] <= this.maxFill);
    };

    this._get_callback = (token, event, data) => {
        if (this.tokenCallbacks.hasOwnProperty(token)) {
            if (this.tokenCallbacks[token].hasOwnProperty(event)) {
                return this.tokenCallbacks[token][event](token, data, this);
            }
        } else if (this.defaultCallback.hasOwnProperty(event)) {
            return this.defaultCallback[event](token, data, this);
        }
    };

    this._get_session = (token) => {
        if (!this.tokenToSession.hasOwnProperty(token)) {
            console.log("INTERNAL WARNING: _get_session called on a non-existent token.");
            return;
        }
        return this.tokenToSession[token];
    };

    this._on_connect = (socket) => {

        if (!this._ip_check(socket)) return;
        socket.once('register', (data) => this._on_register(socket, data));
    };

    this._on_disconnect = (socket) => {
        if (!this.sessionToToken.hasOwnProperty(socket.id)) {
            return;
        }
        let token = this.sessionToToken[socket.id];

        let registry = this;
        this.killTimers[token] = setTimeout(function () {
            registry._get_callback(token, 'disconnect', null);
            delete registry.sessionToToken[socket.id];
            delete registry.tokenToSession[token];
            delete registry.tokenToIp[token];
            delete registry.killTimers[token];
            delete registry.tokenRooms[token];
            delete registry.tokenCallbacks[token];

        }, this.disconnectTime);
    };

    io.on('connect', this._on_connect);
    io.on('disconnect', this._on_disconnect);

    this._register_new_token = (socket) => {
        let newToken = srs();
        this.tokenToSession[newToken] = socket.id;
        this.sessionToToken[socket.id] = newToken;
        this.tokenToIP[newToken] = _get_ip(socket);
        registry._get_callback(newToken, 'connect', null);
        return newToken;
    };

    // what should occur when socket emits
    // some sort of 'register' event
    this._on_register = (socket, data) => {
        // leaky bucket
        if (!this._ip_check(socket)) return;

        // check that socket doesn't already exist
        if (this.sessionToToken.hasOwnProperty(socket.id)) {
            console.log("WARNING: Session attempted to register when it" +
                " already existed. Sending prior token...");
            return this.sessionToToken[socket.id];
        }

        if (data === null) {
            return this._register_new_token(socket)
        } else if (typeof (data) === "string") {
            if (this.tokenToSession.hasOwnProperty(data)) {

                let ipMatch;
                if (!this.tokenToIP.hasOwnProperty(data)) {
                    console.log("WARNING: tts had token \"" +
                        data + "\" but tti did not. Assuming user's IP is correct...");
                    ipMatch = true;
                } else {
                    ipMatch = (this.tokenToIP[data] === _get_ip(socket));
                }


                if (ipMatch) {

                    // check if user is still active
                    if (this.killTimers.hasOwnProperty(data)) {

                        // user is inactive, delete killTimer and create new session info
                        clearTimeout(this.killTimers[data]);
                        delete this.killTimers[data];

                        delete this.sessionToToken[this.tokenToSession[data]];
                        this.sessionToToken[socket.id] = data;
                        this.tokenToSession[data] = socket.id;

                        if (this.tokenRooms.hasOwnProperty(data)) {
                            socket.join(this.tokenRooms[data]);
                        }


                        this._get_callback(token, 'reconnect', null);

                        return data;

                    } else {
                        console.log("WARNING: User attempted to counterfeit token \"" +
                            data + "\", but user was still active. Sending new token...");
                        return this._register_new_token(socket);
                    }

                } else {
                    console.log("WARNING: User attempted to conterfeit token \"" +
                        data + "\", but IP did not match. Sending new token...");
                    return this._register_new_token(socket);
                }

            } else {
                console.log("INFO: User attempted to validate with old/invalid string \"" +
                    data + "\". Sending new token...");
                return this._register_new_token(socket);
            }


        } else {
            console.log("WARNING: User attempted to send invalid data type. Sending nothing back...");
            return null;
        }

    };


    this.register_callback_class = (io, callbacks) => {

        let registry = this;

        for (const trigger in callbacks) {
            if (callbacks.hasOwnProperty(trigger)) {

                if (!['connect', 'disconnect', 'reconnect'].includes(trigger)) {

                    io.on(trigger, function (socket, data) {

                        // leaky bucket
                        if (!registry._ip_check(socket)) return;

                        // if socket is unregistered, let it know
                        if (!this.sessionToToken.hasOwnProperty(socket.id)) {
                            socket.emit('unregistered');
                            console.log("WARNING: Unregistered client sent " +
                                "event \"" + trigger + "\" with data \"" + data + "\"");
                            return;
                        }

                        // run callback
                        let token = sessionToToken[socket.id];
                        return registry._get_callback(token, trigger, data);

                    });
                }


            }

        }
    };

    this.set_callbacks = (token, callbacks) => {

        if (!this.tokenToSession.hasOwnProperty(token)) {
            console.log("INTERNAL WARNING: Callbacks set on non-existent token.");
            return;
        }

        this.tokenCallbacks[token] = callbacks;
    };

    this.send = (token, event, data, callback) => {

        if (!this.io.sockets.connected.hasOwnProperty(session)) {
            // user temporarily disconnected
            return false;
        }

        this.io.sockets.connected[session].emit(event, data, callback);
        return true;


    };

    this.setRoom = (token, room) => {

        let session = this._get_session(token);
        if (!session) return false;

        var sessionActive = this.io.sockets.connected.hasOwnProperty(session);

        if (this.tokenRooms.hasOwnProperty(token)) {
            leaveRoom(token);
        }

        if (this.rooms.hasOwnProperty(room)) {
            this.rooms[room].add(token);
        } else {
            this.rooms[room] = new Set([token]);
        }

        this.tokenRooms[token] = room;

        if (sessionActive) {
            this.io.sockets.connected[session].join(room);
        }

        return true;

    };

    this.leaveRoom = (token) => {

        let session = this._get_session(token);
        if (!session) return false;

        var sessionActive = this.io.sockets.connected.hasOwnProperty(session);

        if (this.tokenRooms.hasOwnProperty(token)) {
            if (sessionActive) this.io.sockets.connected[session].leave(this.tokenRooms[token]);
            this.rooms[this.tokenRooms[token]].delete(token);
            if (this.rooms[this.tokenRooms[token]].size() === 0) {
                delete this.rooms[this.tokenRooms[token]];
            }
            delete this.tokenRooms[token];
        }

        return true;


    };

    this.getMembers = (room) => {
        if (this.rooms.hasOwnProperty(room)) {
            return this.rooms[room];
        }
        return new Set();
    };

    this.sendRoom = (room, event, data, callback) => {
        this.io.sockets.to(room).emit(event, data, callback);
    };

}
module.exports = Registry;