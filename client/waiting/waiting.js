$(document).ready(function () {

    function errorOut(errorMessage) {
        sessionStorage.setItem("error", errorMessage);
        window.location.replace('/');
    }


    var action = sessionStorage.getItem('action');
    if (action === null) {
        errorOut("");
    } else if (action !== "create" && action !== "join") {
        errorOut("");
    }

    var roomCode = null;

    if (action === "join") {
        roomCode = sessionStorage.getItem('room');
        if (roomCode === null) {
            errorOut("");
        } else if (!/^[a-z]{3} [a-z]{3}$/.test(roomCode)) {
            errorOut("That room code is invalid. Please double-check to make sure everything's spelled correctly.");
        }
    }

    var username = localStorage.getItem('name');
    if (username === null) {
        errorOut("");
    } else if (!/^[A-Za-z0-9][A-Za-z0-9 ]{2,15}$/.test(username)) {
        errorOut("That username is invalid. Please double-check to make sure everything's spelled correctly.");
    }

    var game = sessionStorage.getItem('game');
    if (game === null) {
        errorOut("");
    }

    var numPlayers = -1;
    var maxPlayers = -1;
    var minPlayers = -1;
    var gameName = "";


    function joinRoom(response, valid) {
        if (!valid) {
            errorOut(response)
        }

        $("#roomCode").text(roomCode);
        $("#gameName").text(response.name);

    }

    const socket = io('/waiting', {transports: ['websocket'], upgrade: false});

    socket.on('connect', function () {
        $('#disconnectAlert').collapse("hide");

        // register username
        socket.emit('register_username', username, function (response, valid) {
            if (!valid) {
                errorOut(response);
            }

            // username registered, send create request if needed
            if (action === 'create') {
                socket.emit('create', game, function (response, valid) {
                    if (valid) {
                        // room created, send join request
                        roomCode = response;
                        socket.emit('join', [response, game], joinRoom);

                    } else {
                        errorOut(response);
                    }
                });
            }

            else {
                socket.emit('join', [roomCode, game], joinRoom);
            }

        });



    })


});