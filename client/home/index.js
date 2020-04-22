$(document).ready(function () {

    var socket = io();
    base_io(socket);

    var responses = {
        usernameEmpty: "A username is required.",
        roomCodeEmpty: "A room code is required.",
        wrongLength: "Username must be between 3 and 16 characters.",
        invalidCharacters: "Username must only use letters, numbers, and spaces.",
        duplicateSpaces: "Username cannot contain duplicate spaces.",
        affixSpaces: "Username cannot start or end with spaces.",
        genericError: "There was a problem with the server. Please try again later.",
        serverError: "Please double-check this.",
        noRoomFound: "No room was found with that name.",
        usernameUsed: "That username already exists in that room. Please choose a unique one.",
        noRoomCreated: "The server is a bit too busy right now. Please try again later."
    }

    // modal customization
    $('#joinGame').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var title = button.data('title');

        var game = button.data('game');
        $('#joinRoom').data('game', game);
        $('#createRoom').data('game', game);

        // set name to old value
        var user = localStorage.getItem('name');
        var userEntry = $('#username');
        if (userEntry.val().length === 0 && user !== null)
            userEntry.val(user);

        var modal = $(this);
        modal.find('.modal-title').text('Play ' + title);
    });


    let checkUsername = (username) => {

        var usernameError = "";
        // check username validity
        if (username.length === 0) {
            usernameError = "usernameEmpty";
        } else if (username.length < 3 || username.length > 16) {
            usernameError = "wrongLength";
        } else if (username.search(/^[A-Za-z0-9 ]+$/) === -1) {
            usernameError = "invalidCharacters";
        } else if (username.search(/ {2}/) !== -1) {
            usernameError = "duplicateSpaces";
        } else if (username[0] === ' ' || username[username.length - 1] === ' ') {
            usernameError = "affixSpaces";
        }

        return usernameError;
    }

    let checkRoomCode = (roomCode) => {

        var roomCodeError = "";

        if (roomCode.length === 0) {
            roomCodeError = "roomCodeEmpty";
        } else if (roomCode.search(/^[A-Za-z]{3} [A-Za-z]{3}$/) !== 0) {
            roomCodeError = "wrongFormat";
        }

        return roomCodeError;
    }

    // on join room
    $('#joinRoom').on('click', function (event) {

        let roomCode = $('#roomCode')
        let username = $('#username')

        let roomVal = roomCode.val();
        let userVal = username.val();

        let usernameError = checkUsername(userVal);
        let roomCodeError = checkRoomCode(roomVal);

        if (usernameError !== "") {
            $('#usernameFeedback').text(responses[usernameError]);
            username.removeClass('is-valid').addClass('is-invalid');
        } else {
            username.removeClass('is-invalid').addClass('is-valid');
        }

        if (roomCodeError !== "") {
            $('#roomCodeFeedback').text(responses[roomCodeError]);
            roomCode.removeClass('is-valid').addClass('is-invalid');
        } else {
            roomCode.removeClass('is-invalid').addClass('is-valid');
        }

        if (usernameError === "" && roomCodeError === "") {

            socket.emit('submitJoin', {
                username: userVal,
                roomCode: roomVal
            }, (data) => {

                if (data.accepted) {

                } else {
                    if (data.response.username !== undefined) {
                        $('#usernameFeedback').text(responses[data.response.username]);
                        username.removeClass('is-valid').addClass('is-invalid');
                    }

                    if (data.response.roomCode !== undefined) {
                        $('#roomCodeFeedback').text(responses[data.response.roomCode]);
                        roomCode.removeClass('is-valid').addClass('is-invalid');
                    }

                    if (data.response.modal !== undefined) {
                        let modalAlert = $('#modalAlert');
                        modalAlert.text(responses[data.response.modal]);
                        modalAlert.collapse('show');
                    }

                }

            })


        }

    });

    // on create room
    $('#createRoom').on('click', function (event) {



    });


    // clear validation on input
    $('input').on('input', function (event) {
        $(this).removeClass('is-valid is-invalid');
    });

    let modalAlert = $('#modalAlert');
    modalAlert.on('shown.bs.collapse', function (event) {
        $('#joinGame').modal('handleUpdate');
    });
    modalAlert.on('hidden.bs.collapse', function (event) {
        $('#joinGame').modal('handleUpdate');
    })
    modalAlert.on('click', function (event) {
        $(this).collapse('hide');
    })

});