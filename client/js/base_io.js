const base_io = (socket) => {

    socket.on('connect', () => {


        handleNewToken = (token) => {
            console.log("????????")
            if (token === null) sessionStorage.removeItem('refreshToken');
            else sessionStorage.setItem('refreshToken', token);
        }

        socket.emit('register', sessionStorage.getItem('refreshToken'), handleNewToken);

    })

};