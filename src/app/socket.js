const lastViewService = require('../services/LastViewService');

let clients = {};
const socket = (io) => {
    io.on('connect', (socket) => {
        clients[socket.id] = socket;

        console.log('a user connected: ' + socket.id);
        socket.emit('test', 'ping');

        socket.on('test', function (e) {
            console.log(e);
        });

        socket.on('disconnect', function (data) {
            delete clients[socket.id];
            const userId = socket.userId;
            console.log(userId, 'is disconnected');
        });

        socket.on('join', (userId) => {
            socket.userId = userId;
            console.log(`user: ${userId} is join to socket`);
            socket.join(userId);
        });

        socket.on('join-conversations', (conversationIds) => {
            conversationIds.forEach((id) => socket.join(id));
        });

        socket.on('join-conversation', (conversationId) => {
            socket.join(conversationId);
        });
        socket.on('typing', (conversationId, me) => {
            socket.to(conversationId).emit('typing', conversationId, me);
        });

        socket.on('not-typing', (conversationId, me) => {
            socket.to(conversationId).emit('not-typing', conversationId, me);
        });
        socket.on('has-call', (userId, myId) => {
            console.log(userId, myId);

            socket.to(userId).emit('notify-call', myId);
        });
        socket.on('answer-call', (idCall) => {
            console.log('answer-call', idCall);
            socket.to(idCall).emit('accept-call', idCall);
        });
    });
};

module.exports = socket;
