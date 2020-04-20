import asyncio
import uvicorn
import socketio

sio = socketio.AsyncServer(async_mode='asgi')
app = socketio.ASGIApp(sio, static_files={
    '/': 'client/index/index.html',
    '/index.css': 'client/index/index.css',
    '/index.js': 'client/index/index.js',

    '/favicon.ico': 'client/favicon.ico',
    '/background.js': 'client/background.js',

    '/waiting': 'client/waiting/waiting.html',
    '/waiting.css': 'client/waiting/waiting.css',
    '/waiting.js': 'client/waiting/waiting.js'

})





if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=5000)