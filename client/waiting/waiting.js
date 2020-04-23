$(document).ready(function () {

    $('[data-toggle="tooltip"]').tooltip({
        delay: {show: 500, hide: 300},
        template: '<div class="tooltip" role="tooltip">' +
            '<div class="arrow"></div>' +
            '<div class="tooltip-inner py-2 px-3"></div></div>',
        trigger: 'hover',
        placement: 'top',
        title: function () {
            return $(this).data('tooltip-title');
        }
    });

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
                    return '<div class="col"><h3 class="text-white player ' +
                        (data.ready ? 'text-white-50' : '') + '" data-public="' +
                        data.public + '">' + data.username + '</h3></div>';
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
            // fix ready button
            let ready_button = $('#ready-button');
            ready_button.removeClass('btn-secondary').addClass('btn-primary');
            $(this).tooltip('hide').data('tooltip-title', 'Ready Up');
            ready_button.collapse('show');

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

    $('#ready-button').on('click', function () {
        $(this).blur();
        if ($(this).hasClass('btn-primary')) {
            $(this).removeClass('btn-primary').addClass('btn-secondary');
            safe_emit(socket, 'ready', {isReady: true}, () => {
            });
            $(this).tooltip('hide').data('tooltip-title', 'Undo Ready Up');
        } else {
            $(this).removeClass('btn-secondary').addClass('btn-primary');
            safe_emit(socket, 'ready', {isReady: false}, () => {
            })
            $(this).tooltip('hide').data('tooltip-title', 'Ready Up');
        }
    });

    socket.on('ready', (data) => {

        let target = $('.player[data-public="' + data.member + '"]');

        if (data.isReady) {
            target.addClass("text-white-50");
        } else {
            target.removeClass("text-white-50");
        }

    })


});