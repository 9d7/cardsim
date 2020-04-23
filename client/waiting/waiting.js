$(document).ready(function () {

    function getStatus(members, minPlayers) {
        let numLeft = minPlayers - members;
        if (numLeft <= 0) {
            return "Waiting for everyone to ready up...";
        }
        return "Waiting for " + numLeft + " more " +
            (numLeft === 1 ? "player" : "players") + "...";
    }


    var socket = io();
    base_io(socket, [
        () => {
            safe_emit(socket, 'getData', null, (data) => {
                $('#roomCode').text(data.code);
                $('#status').text(getStatus(data.members.length, data.min_players));
                $('#gameName').text(data.name);
            });
        }
    ]);

    $('#back-button').on('click', () => {
        safe_emit(socket, 'leaveRoom', null, (data) => {});
    })


});