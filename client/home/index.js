$(document).ready(function () {

    var socket = io();
    base_io(socket);

    var redirectAlert = $("#redirectAlert");
    var errorCode = sessionStorage.getItem('error');
    if (errorCode !== null && errorCode !== "") {
        redirectAlert.text(errorCode);
        redirectAlert.collapse("show");
        sessionStorage.removeItem('error');
    }

    redirectAlert.click(function() {
        redirectAlert.collapse("hide");
    });

    // modal customization
    $('#joinGame').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var title = button.data('title');

        var game = button.data('game');

        var localGame = sessionStorage.getItem('game');
        console.log(localGame);

        if (game !== localGame) {
            sessionStorage.setItem('game', game);
            sessionStorage.removeItem('room');
        }

        var room = sessionStorage.getItem('room');
        var roomCodeEntry = $('#roomCode');

        // set room code to old value if playing the same game
        if (roomCodeEntry.val().length === 0 && room !== null)
            roomCodeEntry.val(room);

        // set name to old value
        var user = localStorage.getItem('name');
        var userEntry = $('#username');

        if (userEntry.val().length === 0 && user !== null)
            userEntry.val(user);

        var modal = $(this);
        modal.find('.modal-title').text('Play ' + title);
    });


    function checkUsername() {
        var username = $('#username');
        var userVal = username.val();
        var feedback = $('#usernameFeedback');


        var retval = username[0].checkValidity();


        if (userVal.length === 0) {
            feedback.text('A username is required.');
        } else if (userVal.length < 3) {
            feedback.text('Username must be at least three characters.');
        } else if (userVal.length > 16) {
            feedback.text('Username must be at most sixteen characters.');
        } else {
            feedback.text('Username must consist of only letters, numbers, and spaces.')
        }


        username.parent()[0].classList.add('was-validated');

        if (retval) localStorage.setItem('name', userVal);

        return retval;
    }

    function checkRoomCode() {
        var roomCode = $('#roomCode');
        var roomVal = roomCode.val();
        var feedback = $('#roomCodeFeedback');

        if (roomVal.length === 0) {
            feedback.text('A room code is required.');
        } else {
            feedback.text('The room code should be two three-letter words, separated by a space, e.g. "bed bug."');
        }

        var retval = roomCode[0].checkValidity();
        roomCode.parent()[0].classList.add('was-validated');

        if (retval) sessionStorage.setItem('room', roomVal.toLowerCase());

        return retval;

    }

    // modal validation
    $('#joinRoom').on('click', function (event) {

        var userValid = checkUsername();
        var roomValid = checkRoomCode();

        if (userValid && roomValid) {
            sessionStorage.setItem('action', 'join');
            window.location.href = '/waiting';
        }


    });

    $('#createRoom').on('click', function (event) {

        if (checkUsername()) {
            sessionStorage.setItem('action', 'create');
            window.location.href = '/waiting';
        }

    });


    $('input').on('input', function (event) {
        $(this).parent()[0].classList.remove('was-validated');
    });

});