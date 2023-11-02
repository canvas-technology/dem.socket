import express from 'express';
import {Server} from 'socket.io';
import * as path from "path";
import cors from 'cors';
import bodyParser from "body-parser";

const backendToken = '9985530a-429f-4840-8250-df6154a785b0';
const availableRooms = [];

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: "30mb", extended: true}));
const server = app.listen(3000);
const socket = new Server(server, {cors: {origin: '*'}});
const __dirname = path.resolve();

const securityMiddleware = (req, res, next) => {
    if (req.headers.token === backendToken) {
        next();
    } else {
        res.status(401).send();
    }
}

app.get('/create-room', securityMiddleware, (req, res) => {
    const room = req.query.room;
    if (!availableRooms.includes(room)) {
        availableRooms.push(room);
    }
    res.send({message: 'room created'});
})

app.get('/delete-room', securityMiddleware, (req, res) => {
    const room = req.query.room;
    if (availableRooms.includes(room)) {
        availableRooms.splice(availableRooms.indexOf(room), 1);
        socket.in(room).disconnectSockets(true)
    }
    res.send({message: 'room deleted'});
})

app.post('/message', securityMiddleware, (req, res) => {
    const room = req.body.room ?? 'default';
    const type = req.body.type ?? 'message';
    const message = req.body.message ?? '';

    if (message === '' || !availableRooms.includes(room)) {
        res.status(400).send();
        return;
    }

    socket.to(room).emit(type, message);
    res.send({message: 'message sent'});
})

socket.on('connection', (socket) => {
    const header = socket.handshake.headers;
    if (header.room && availableRooms.includes(header.room)) {
        socket.join(header.room);
    } else {
        socket.disconnect();
    }

    socket.on('message', (data) => {
        socket.to(data.room).emit(data.type ?? 'message', data.message);
    })
});


