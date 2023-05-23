const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require("cors")
const bodyParser = require("body-parser");
const imports = require('./container/imports');
const mongoose=require("mongoose");
require('dotenv').config()
const SocketProvider=require("./socket")


app.use(cors())
app.use(bodyParser.json())
mongoose.connect(process.env.DB)

const io = new Server(server, {
    cors: {
        origin: "*",
    }
});


let socket=new SocketProvider(io)
socket.lunch()

let keys= Object.keys(imports)

keys.forEach(key => {
    app.use(`/${key}`,imports[key])
});
app.use("/files",express.static("./files"))

server.listen(process.env.PORT, () => { console.log("Server Run"); })
