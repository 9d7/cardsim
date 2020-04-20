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


    const socket = io('/waiting', {transports: ['websocket'], upgrade: false});

    socket.on('connect', function () {
        $('#disconnectAlert')[0].classList.add('collapse');

        socket.emit('userdata', {
            name: localStorage.getItem('name')
        });


    })


});