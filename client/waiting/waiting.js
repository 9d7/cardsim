$(document).ready(function () {

    $('[data-toggle="tooltip"]').tooltip();

    function getStatus(members, minPlayers) {
        let numLeft = minPlayers - members;
        if (numLeft <= 0) {
            return "Waiting for everyone to ready up...";
        }
        return "Waiting for " + numLeft + " more " +
            (numLeft === 1 ? "player" : "players") + "...";
    }

    const generatePlayerList = (players) => {

        var output = [];
        for (let i = 0; i < players.length; i += 3) {

            output.push(
                '<div class="row my-3">' +
                players.slice(i, i + 3).map((data) => {
                    return '<div class="col"><h3 class="text-white player">' + data + '</h3></div>';
                }).join("") +
                '</div>'
            );

        }
        return output.join("");
    }

    var min_players = -1;
    const update = (members) => {
        $('#status').text(getStatus(members.length, min_players));
        $('#player-list').html(generatePlayerList(members));
        if (members.length >= min_players) {
            $('#ready-button').collapse('show');
        } else {
            $('#ready-button').collapse('hide');
        }
    }


    var socket = io();
    base_io(socket, [
        () => {
            safe_emit(socket, 'getData', null, (data) => {
                $('#roomCode').text(data.code);
                $('#gameName').text(data.name);

                min_players = data.min_players;
                update(data.members);
            });
        }
    ]);

    $('#back-button').on('click', () => {
        safe_emit(socket, 'leaveRoom', null, (data) => {
        });
    })


    var row = '<div class="row my-3">{{cols}}</div>';
    var col = '<div class="col"><h3 class="text-white player">{{player}}</h3></div>';

    socket.on('userUpdate', (data) => {
        update(data.members);
    });


});