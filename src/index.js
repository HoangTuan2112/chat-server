require('dotenv').config();
const express = require('express');
const cors = require('./config/cors');
const http = require('http');
const useragent = require('express-useragent');
const db = require('./config/db');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.SERVER_PORT;
const refreshTokenRouter = require('./routes/refreshTokentRouter');
const handleErr = require('./middleware/handleErr');
const socketio = require('socket.io');

// routes
const routes = require('./routes');
const socket = require('./app/socket');

db.connect();

app.use(cors);
app.use(useragent.express());

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use('/refresh_token', refreshTokenRouter);
const server = http.createServer(app);
const io = socketio(server);
socket(io);

routes(app, io);

app.use(handleErr);

server.listen(port, function () {
    console.log('server started on http://localhost:' + port);
});
