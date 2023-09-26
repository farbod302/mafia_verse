const express = require('express');
const fs = require("fs")
const app = express();
require('dotenv').config()
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors")
const bodyParser = require("body-parser");
const imports = require('./container/imports');
const mongoose = require("mongoose");
const SocketProvider = require("./socket");
const Jwt = require('./helper/jwt');
const reject = require('./helper/reject_handler');
const { check_last_msgs } = require('./socket/server_channel_msg/send_server_msg');
const check_bad_words = require('./socket/bad_word');

const token_handler = (req, res, next) => {
    const { token } = req.body
    if (!token) return next()
    const user = Jwt.verify(token)
    if (!user) return reject(2, res)
    req.body.user = user
    next()
}



app.use(cors())
app.use(bodyParser.json())
app.use(token_handler)
mongoose.connect(process.env.DB)




let keys = Object.keys(imports)



const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});
let socket = new SocketProvider(io)
socket.lunch()

const middle = (req, res, next) => {
    // const need_socket=req.body.socket
    const need_socket = true
    if (need_socket) req.socket = io
    next()
}

app.use(middle)



keys.forEach(key => {
    app.use(`/${key}`, imports[key])
});

app.use("/files", express.static("./files"))
app.use("/characters", express.static("./characters"))
server.listen(process.env.PORT, () => { console.log("Server Run"); })




check_last_msgs()




// const clean_deck = () => {
//     const deck = fs.readFileSync("./games/local/deck.json")
//     let deck_json = JSON.parse(deck.toString())
//     const clean_deck = deck_json.map(d => {
//         const { id, mafia, solo, icon, info } = d
//         const { name, description } = info.fa
//         return {
//             id, side: mafia ? "mafia" : solo ? "solo" : "Citizen",
//             icon: "http://192.168.43.161:4090/characters/" + icon,
//             name, description,
//             multi: false
//         }
//     })
//     fs.writeFileSync("./games/local/clean_deck.json", JSON.stringify(clean_deck))
// }

// clean_deck()