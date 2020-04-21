const base_io = (socket) => {

    socket.on('connect', function () {
        // for some reason chrome can't detect when i send this frame immediately on connect,
        // so we'll delay it by a bit for debugging purposes.
        setTimeout(() => {
            socket.emit("register", sessionStorage.getItem('refreshToken'), (data) => {
                sessionStorage.setItem('refreshToken', data);
            });
        }, 5);


    })




};