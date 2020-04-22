'use strict';

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
    this.tokenToIP = {};
    this.ipBuckets = {};
    this.killTimers = {};
    this.tokenData = {};

    this.maxFill = maxFill;
    this.disconnectTime = disconnectTime;
    this.defaultCallback = defaultCallback;
    this.io = io;
    this.leakRate = leakRate;

    // the "leak" for the leaky buckets
    setInterval(() => {
        for (const bucket in this.ipBuckets) {
            if (this.ipBuckets.hasOwnProperty(bucket)) {
                this.ipBuckets[bucket] -= 1
                this.ipBuckets[bucket] = Math.max(this.ipBuckets[bucket], 0);
            }

        }
    }, leakRate);

    // periodic clear of empty buckets
    setInterval(() => {
        for (const bucket in this.ipBuckets) {
            if (this.ipBuckets.hasOwnProperty(bucket)) {
                if (this.ipBuckets[bucket] === 0) {
                    delete this.ipBuckets[bucket];
                }
            }
        }
    }, ipClearRate);


    /**
     * Gets the IP Adress of a socket. It seems like the API
     * constantly changes, so it's wrapped here just to be safe.
     * @param socket        The socket to get the IP from.
     * @returns {string}    The IP.
     * @private
     */
    this._getIp = (socket) => {
        return socket.handshake.address;
    };

    /**
     * Adds a drip to the socket IP's bucket, and determines if the
     * socket should be ignored. This is implemented on a per-IP level,
     * as to prevent anybody from just opening a bunch of tabs.
     * @param socket        The socket
     * @returns {boolean}   Whether to respond to the socket.
     * @private
     */
    this._ipCheck = (socket) => {
        let ip = this._getIp(socket);

        if (!this.ipBuckets.hasOwnProperty(ip)) {
            this.ipBuckets[ip] = 1;
        } else {
            this.ipBuckets[ip]++;
        }

        console.log(this.ipBuckets[ip]);

        let retval = (this.ipBuckets[ip] <= this.maxFill);
        if (!retval && (this.ipBuckets[ip] <= this.maxFill + 1)) {
            socket.emit('throttled');
        }
        return retval;
    };

    /**
     * Internal-use function for triggering a callback function.
     * If a tokenCallback exists, this function will use that for
     * the callback. Otherwise, it will attempt to use the default.
     * @param token     The token to get the callback from
     * @param event     The event to call
     * @param data      The data to call the event with
     * @returns {*}     The return value of the callback
     * @private
     */
    this._getCallback = (token, event, data) => {
        if (this.tokenCallbacks.hasOwnProperty(token)) {
            if (this.tokenCallbacks[token].hasOwnProperty(event)) {
                return this.tokenCallbacks[token][event](token, data, this);
            }
        } else if (this.defaultCallback.hasOwnProperty(event)) {
            return this.defaultCallback[event](token, data, this);
        }
    };

    /**
     * Gets the session corresponding with a given token.
     * @param token         The token to lookup
     * @returns {string}    The session token, if it exists.
     * @private
     */
    this._getSession = (token) => {
        if (!this.tokenToSession.hasOwnProperty(token)) {
            console.log("INTERNAL WARNING: _get_session called on a non-existent token.");
            return null;
        }
        return this.tokenToSession[token];
    };

    /**
     * The callback registered with the socket manager.
     * This is run any time there is a new socket connection.
     * Currently, this only does two things:
     * - Register a disconnect handler for this socket
     * - Wait for the socket to send a registration frame, then call _on_register.
     * @param socket    The new socket connection.
     * @private
     */
    this._onConnect = (socket) => {

        socket.on('disconnect', (reason) => {
            this._onDisconnect(socket, reason)
        });
        socket.once('register', (data, fn) => {
            fn(this._onRegister(socket, data))
        });
    };
    this.io.on('connect', this._onConnect);

    /**
     * The callback registered with each socket upon its end-of-session
     * with the server. Note that this is NOT what is called at the token's
     * end-of-life, since the user can potentially reconnect.
     *
     * This function will schedule the removal of the token after
     * disconnectTime ms, at which point it will be deleted from
     * all memory in the server (except ipBuckets, which are cleared
     * periodically).
     *
     * @param socket    The socket that disconnected
     * @param reason    The reason for the disconnect. Currently unused.
     * @private
     */
    this._onDisconnect = (socket, reason) => {

        if (!this.sessionToToken.hasOwnProperty(socket.id)) {
            return;
        }
        let token = this.sessionToToken[socket.id];

        this.killTimers[token] = setTimeout(() => {
            this._getCallback(token, 'disconnect', null);
            delete this.tokenToSession[token];
            delete this.tokenToIP[token];
            delete this.killTimers[token];
            delete this.tokenRooms[token];
            delete this.tokenCallbacks[token];
            delete this.sessionToToken[socket.id];
            delete this.tokenData[token];

        }, this.disconnectTime);
    }


    /**
     * Registers a new token-socket pair and inserts it into the Registry memory.
     * @param socket        The socket to register
     * @returns {string}    The token
     * @private
     */
    this._registerNewToken = (socket) => {
        let newToken = srs();
        this.tokenToSession[newToken] = socket.id;
        this.sessionToToken[socket.id] = newToken;
        this.tokenToIP[newToken] = this._getIp(socket);
        this._hookupCallbacks(socket, newToken, this.defaultCallback);
        this._getCallback(newToken, 'connect', null);
        return newToken;
    };

    /**
     * After connecting, the client sends a "register" event.
     * This event could contain either a token, or nothing.
     * If it contains a token, the server checks against all the stored tokens
     * to evaluate if it should re-activate an interrupted session. If it
     * does not, the server creates and distributes a new token.
     * @param socket            The socket that sent the event
     * @param data              The data the socket sent
     * @returns {string|null}   On success, the token. On failure, null.
     * @private
     */
    this._onRegister = (socket, data) => {

        // leaky bucket
        if (!this._ipCheck(socket)) {
            socket.emit('throttled');
            return;
        }

        // check that socket doesn't already exist
        if (this.sessionToToken.hasOwnProperty(socket.id)) {
            console.log("WARNING: Session attempted to register when it" +
                " already existed. Sending prior token...");
            return this.sessionToToken[socket.id];
        }

        if (data === null) {
            return this._registerNewToken(socket)
        } else if (typeof (data) === "string") {
            if (this.tokenToSession.hasOwnProperty(data)) {

                let ipMatch;
                if (!this.tokenToIP.hasOwnProperty(data)) {
                    console.log("WARNING: tts had token \"" +
                        data + "\" but tti did not. Assuming user's IP is correct...");
                    ipMatch = true;
                } else {
                    ipMatch = (this.tokenToIP[data] === this._getIp(socket));
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

                        if (this.tokenCallbacks.hasOwnProperty(data)) {
                            this._hookupCallbacks(socket, data, this.tokenCallbacks[data]);
                        } else {
                            this._hookupCallbacks(socket, data, this.defaultCallback);
                        }


                        if (this.tokenRooms.hasOwnProperty(data)) {
                            socket.join(this.tokenRooms[data]);
                        }


                        this._getCallback(data, 'reconnect', null);

                        return data;

                    } else {
                        console.log("WARNING: User attempted to counterfeit token \"" +
                            data + "\", but user was still active. Sending new token...");
                        return this._registerNewToken(socket);
                    }

                } else {
                    console.log("WARNING: User attempted to conterfeit token \"" +
                        data + "\", but IP did not match. Sending new token...");
                    return this._registerNewToken(socket);
                }

            } else {
                console.log("INFO: User attempted to validate with old/invalid string \"" +
                    data + "\". Sending new token...");
                return this._registerNewToken(socket);
            }


        } else {
            console.log("WARNING: User attempted to send invalid data type. Sending nothing back...");
            return null;
        }

    };

    this._getCallbacksFromObject = (callbacks) => {
        return Object.keys(callbacks).filter(
            x => !['connect', 'reconnect', 'disconnect'].includes(x) &&
                callbacks.hasOwnProperty(x)
        );
    }

    this._getCallbacksFromToken = (token) => {
        if (this.tokenCallbacks.hasOwnProperty(token)) {
            return this._getCallbacksFromObject(this.tokenCallbacks[token]);
        } else {
            return this._getCallbacksFromObject(this.defaultCallback);
        }
    }

    this._hookupCallbacks = (socket, token, callbacks) => {

        this._getCallbacksFromObject(callbacks).map(
            x => socket.on(x, (data, fn) => {

                if (!this._ipCheck(socket)) return null;

                if (!this.sessionToToken.hasOwnProperty(socket.id)) {
                    console.log("WARNING: User attempted to send frame while unregistered. Sending signal...");
                    socket.emit('unregistered');
                    return null;
                }

                let token = this.sessionToToken[socket.id];
                fn(callbacks[x](token, data, this));

            })
        )

    }

    this.setCallbacks = (token, callbacks) => {

        let session = self._getSession(token);
        if (session === null) return;


        if (!self.io.sockets.connected.hasOwnProperty(session)) {
            // user temporarily disconnected
            // this is fine, callbacks are updated in registry for when they return,
            this.tokenCallbacks[token] = callbacks;
            return;
        }

        let socket = self.io.sockets.connected[session];

        this._getCallbacksFromToken(token).map(
            x => socket.removeAllListeners(x)
        )

        this.tokenCallbacks[token] = callbacks;
        this._hookupCallbacks(socket, token, callbacks);

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

        let session = this._getSession(token);
        if (!session) return false;

        var sessionActive = this.io.sockets.connected.hasOwnProperty(session);

        if (this.tokenRooms.hasOwnProperty(token)) {
            leaveRoom(token);
        }

        this.tokenRooms[token] = room;

        if (sessionActive) {
            this.io.sockets.connected[session].join(room);
        }

        return true;

    };

    this.leaveRoom = (token) => {

        let session = this._getSession(token);
        if (!session) return false;

        var sessionActive = this.io.sockets.connected.hasOwnProperty(session);

        if (this.tokenRooms.hasOwnProperty(token)) {
            if (sessionActive) this.io.sockets.connected[session].leave(this.tokenRooms[token]);
            delete this.tokenRooms[token];
        }

        return true;


    };

    this.getRoom = (token) => {

        let session = this._getSession(token);
        if (!session) return false;

        if (this.tokenRooms.hasOwnProperty(token)) {
            return this.tokenRooms[token];
        }

        return null;

    }

    this.sendRoom = (room, event, data, callback) => {
        this.io.sockets.to(room).emit(event, data, callback);
    };

    this.setToken = (token, key, val) => {

        if (!this.tokenToSession.hasOwnProperty(token)) {
            console.log("INTERNAL WARNING: Attempted to set data of non-existent token.");
            return null;
        }

        if (!this.tokenData.hasOwnProperty(token)) {
            this.tokenData[token] = {};
        }
        this.tokenData[token][key] = val;
        return true;
    }

    this.getToken = (token, key) => {
        if (!this.tokenToSession.hasOwnProperty(token)) {
            console.log("INTERNAL WARNING: Attempted to set data of non-existent token.");
            return null;
        }

        if (!this.tokenData.hasOwnProperty(token)) {
            return null;
        }
        return this.tokenData[token][key];
    }
};
module.exports = Registry;