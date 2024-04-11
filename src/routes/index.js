const userRouter = require('./user');
const authRouter = require('./auth');

const checkAuth = require('../middleware/checkAuth');

const route = (app, io) => {
    const friendRouter = require('./friend')(io);
    const messageRouter = require('./message')(io);
    const conversationRouter = require('./conversation')(io);
    const meRouter = require('./me')(io);
    const memberRouter = require('./member')(io);
    app.use('/users', checkAuth, userRouter);
    app.use('/members', checkAuth, memberRouter);
    app.use('/m', checkAuth, meRouter);
    app.use('/auth', authRouter);
    app.use('/friends', checkAuth, friendRouter);
    app.use('/messages', checkAuth, messageRouter);
    app.use('/conversations', checkAuth, conversationRouter);
};

module.exports = route;
