import express from 'express';
import {Server} from 'socket.io';
import cors from 'cors';
import bodyParser from "body-parser";

const backendToken = '9985530a-429f-4840-8250-df6154a785b0';
const availableRooms = ['info'];

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: "30mb", extended: true}));
const server = app.listen(3000);
const socket = new Server(server, {cors: {origin: '*'}});

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

app.post('/create-room', (req, res) => {
    const room = req.body.room;
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
    let room = header.room;
    if (header.room && availableRooms.includes(header.room)) {
        socket.join(header.room);
        let rooms = Array.from(socket.adapter.rooms.keys());
        const sids = Array.from(socket.adapter.sids.keys());
        rooms = rooms.filter(room => !sids.includes(room));
        const data = [];
        for (const room of rooms) {
            const total = socket.in(room).adapter.rooms.get(room).size;
            data.push({room, total});
        }
        socket.to('info').emit('room-info', data);
        socket.emit('room-info', data);
    } else {
        socket.disconnect();
        return;
    }

    let total = 0;
    try {
        total = socket.in(room).adapter.rooms.get(room).size;
    } catch (e) {

    }

    const connectionMessage = {
        user: socket.id,
        total
    }

    socket.to(room).emit('user-connected', connectionMessage)
    socket.emit('user-connected', connectionMessage)

    socket.on('message', (data) => {
        socket.to(data.room).emit(data.type ?? 'message', data.message);
    })
    socket.on('disconnect', () => {
        let total = 0;
        try {
            total = socket.in(room).adapter.rooms.get(room).size;
        } catch (e) {

        }
        socket.to(room).emit('user-disconnected', {status: true, total})
    })
});


