$(document).ready(function () {

    var socket = io();
    base_io(socket);

    var responses = {
        usernameEmpty: "A username is required.",
        roomCodeEmpty: "A room code is required.",
        wrongLength: "Username must be between 3 and 16 characters.",
        wrongFormat: "The room code should be two three-letter words, " +
            "separated by a space, like \"bed bug.\"",
        invalidCharacters: "Username must only use letters, numbers, and spaces.",
        duplicateSpaces: "Username cannot contain duplicate spaces.",
        affixSpaces: "Username cannot start or end with spaces.",
        genericError: "There was a problem with the server. Please try again later.",
        serverError: "Please double-check this.",
        noRoomFound: "No room was found with that name.",
        usernameUsed: "That username already exists in that room. Please choose a unique one.",
        noRoomCreated: "The server is a bit too busy right now. Please try again later.",
        roomFull: "That room is full."
    }

    // modal customization
    $('#joinGame').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var title = button.data('title');

        var game = button.data('game');
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

        let userVal = username.val();

        var usernameError = "";
        // check username validity
        if (userVal.length === 0) {
            usernameError = "usernameEmpty";
        } else if (userVal.length < 3 || userVal.length > 16) {
            usernameError = "wrongLength";
        } else if (userVal.search(/^[A-Za-z0-9 ]+$/) === -1) {
            usernameError = "invalidCharacters";
        } else if (userVal.search(/ {2}/) !== -1) {
            usernameError = "duplicateSpaces";
        } else if (userVal[0] === ' ' || userVal[userVal.length - 1] === ' ') {
            usernameError = "affixSpaces";
        }

        if (usernameError !== "") {
            $('#usernameFeedback').text(responses[usernameError]);
            username.addClass('is-invalid');
            return false;
        } else {
            localStorage.setItem('name', userVal);
            username.removeClass('is-invalid');
            return true;
        }
    }

    let checkRoomCode = (roomCode) => {

        let roomVal = roomCode.val();
        var roomCodeError = "";

        if (roomVal.length === 0) {
            roomCodeError = "roomCodeEmpty";
        } else if (roomVal.search(/^[A-Za-z]{3} [A-Za-z]{3}$/) !== 0) {
            roomCodeError = "wrongFormat";
        }

        if (roomCodeError !== "") {
            $('#roomCodeFeedback').text(responses[roomCodeError]);
            roomCode.addClass('is-invalid');
            return false;
        } else {
            roomCode.removeClass('is-invalid');
            return true;
        }

    }

    joinResponse = (data) => {

        if (data.accepted) {

            window.location.replace('/waiting');

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

    }

    // on join room
    $('#joinRoom').on('click', function (event) {

        let roomCode = $('#roomCode')
        let username = $('#username')

        let roomVal = roomCode.val();
        let userVal = username.val();

        let usernameOK = checkUsername(username);
        let roomCodeOK = checkRoomCode(roomname);

        if (usernameOK && roomCodeOK) {

            safe_emit(socket,'submitJoin', {
                username: userVal,
                roomCode: roomVal
            }, joinResponse);


        }

    });

    // on create room
    $('#createRoom').on('click', function (event) {

        let username = $('#username');
        let userVal = username.val();

        let game = $(this).data('game');

        if (checkUsername(username)) {

            safe_emit(socket, 'submitCreate', {
                username: userVal,
                game: game
            }, joinResponse);

        }


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
    });
    modalAlert.on('click', function (event) {
        $(this).collapse('hide');
    });

});