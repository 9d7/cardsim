const base_io = (socket, onConnect) => {

    socket.on('connect', function () {
        // we delay the safe emit so we don't get spammed by people who
        // just hold down refresh.
        safe_emit(socket, "register", sessionStorage.getItem('refreshToken'), (data) => {
            sessionStorage.setItem('refreshToken', data);
            if (onConnect !== undefined) onConnect.forEach((x) => {x();});
        });

    });

    socket.on('ensure_location', function (path) {

        if (path !== window.location.pathname) {
            window.location.replace(path);
        }

    })


    let commonAlert = $('#commonAlert');
    commonAlert.on('click', function (event) {
        $(this).collapse('hide');
    });

    socket.on('throttled', function () {

        commonAlert.text("Uh oh! Looks like we're getting a lot of attention from your IP address. " +
            "If this is an honest mistake, wait ten seconds or so, then refresh.");
        commonAlert.collapse('show');

    });


};

const safe_emit = (socket, event, data, fn) => {
    let t = setTimeout(unregistered, 500);
    socket.emit(event, data, function (response) {
        clearTimeout(t);
        if (response === null) {
            unregistered();
        } else {
            fn(response);
        }
    })
};


const unregistered = () => {
    let commonAlert = $("#commonAlert");
    commonAlert.text("Uh oh! Looks like we had some trouble connecting you to the server. Please refresh.");
    commonAlert.collapse('show');
};