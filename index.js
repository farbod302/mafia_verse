const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors")
const bodyParser = require("body-parser");
const imports = require('./container/imports');
const mongoose=require("mongoose");
require('dotenv').config()
const SocketProvider=require("./socket");
const Jwt = require('./helper/jwt');
const reject = require('./helper/reject_handler');

const token_handler=(req,res,next)=>{
    const {token}=req.body
    if(!token) return next()
    const user=Jwt.verify(token)
    if(!user)return reject(2,res)
    req.body.user=user
    next()
}



app.use(cors())
app.use(bodyParser.json())
app.use(token_handler)
mongoose.connect(process.env.DB)




let keys= Object.keys(imports)

keys.forEach(key => {
    app.use(`/${key}`,imports[key])
});
app.use("/files",express.static("./files"))


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});
let socket=new SocketProvider(io)
socket.lunch()



server.listen(process.env.PORT, () => { console.log("Server Run"); })



