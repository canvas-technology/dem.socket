import express from 'express';
import { Server } from 'socket.io';
import * as path from "path";
import cors from 'cors';

const backendToken = '9985530a-429f-4840-8250-df6154a785b0';
const availableRooms = [];

const app = express();
app.use(cors());
const server = app.listen(3000);
const socket = new Server(server);
const __dirname = path.resolve();

app.get('/create-room', (req, res) => {
    const room = req.query.room;
    if(req.headers.token === backendToken) {
        if(!availableRooms.includes(room)) {
            availableRooms.push(room);
        }
        res.send({message: 'room created'});
    }
})

app.get('/delete-room', (req, res) => {
    const room = req.query.room;
    if(req.headers.token === backendToken) {
        if(availableRooms.includes(room)) {
            availableRooms.splice(availableRooms.indexOf(room), 1);
            socket.in(room).disconnectSockets(true)
        }
        res.send({message: 'room deleted'});
    }
})

socket.on('connection', (socket) => {
    const header = socket.handshake.headers;
    if(header.room && availableRooms.includes(header.room)) {
        socket.join(header.room);
    }else {
        socket.disconnect();
    }

    socket.on('message', (data) => {
        console.log(data);
        socket.to(data.room).emit(data.type ?? 'message', data.message);
    })
});


