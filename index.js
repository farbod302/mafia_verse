const express = require('express');
const fs = require("fs")

const app = express();
require('dotenv').config()
const http = require('http');
const https = require('https');
const { Server } = require("socket.io");
const cors = require("cors")
const bodyParser = require("body-parser");
const imports = require('./container/imports');
const mongoose = require("mongoose");
const SocketProvider = require("./socket");
const Jwt = require('./helper/jwt');
const reject = require('./helper/reject_handler');
const { check_last_msgs } = require('./socket/server_channel_msg/send_server_msg');
const Session = require('./session');
const { CronJob } = require("cron");
const Transaction = require('./helper/transaction');
const send_notif = require('./helper/send_notif');
const monitoring = require('./container/monitoring');
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
const middle = (req, res, next) => {
    // const need_socket=req.body.socket
    const need_socket = true
    if (need_socket) req._socket = io
    next()
}

app.use(middle)





mongoose.connect(process.env.DB_SERVER)
let keys = Object.keys(imports)


const conf = {
    key: fs.readFileSync("/etc/letsencrypt/live/mafia.altf1.ir/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/mafia.altf1.ir/fullchain.pem")
}


const server = https.createServer(conf,app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },

})



let socket = new SocketProvider(io)
socket.lunch()
monitoring.init(io)



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



const create_daily_session = new CronJob("0 0 * * *", () => { Session.create_session("day") })
const create_weekly_session = new CronJob("0 0 * * 6", () => { Session.create_session("week") })
const create_monthly_session = new CronJob("0 0 1 * *", () => { Session.create_session("month") })

// Session.create_session("day")
// Session.create_session("week")
// Session.create_session("month")

create_daily_session.start()
create_weekly_session.start()
create_monthly_session.start()

Transaction.refresh_token()
const refresh_api_token_job = new CronJob("58 * * * *", Transaction.refresh_token)
// refresh_api_token_job.start()


//3119103712
//test_2


send_notif({
    users:["32ca"],
    msg:"ji",
    title:"jo9"
})