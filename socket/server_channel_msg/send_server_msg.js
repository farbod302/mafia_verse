const Channel = require("../../db/channel")
const fs = require("fs")
const { msg_cash } = require("../../routs/channel_cash")
const { uid } = require("uid")
const check_last_msgs = async () => {
    const channels = await Channel.find()
    const last_msgs_date = {}
    channels.map(channel => {
        const { messages, id } = channel
        if (messages.length == 0) return
        const last_msg = messages.slice(-1)[0].msg_time
        const last_msg_date = new Date(last_msg)
        const true_date = `${last_msg_date.getMonth()}/${last_msg_date.getDate()}`
        last_msgs_date["_" + id] = true_date
    })
    console.log({ last_msgs_date });
    fs.writeFileSync(`${__dirname}/last_msgs.json`, JSON.stringify(last_msgs_date))
}



const check_last_msg = async (channel_id, socket) => {

    let msg_data = fs.readFileSync(`${__dirname}/last_msgs.json`)
    msg_data = JSON.parse(msg_data.toString())
    const last_msg_time = msg_data[`_${channel_id}`]
    console.log({ last_msg_time });
    if (!last_msg_time) {
        let cur_time = new Date()
        const time_str = `${cur_time.getMonth()}/${cur_time.getDate()}`
        msg_data[`_${channel_id}`] = time_str
        fs.writeFileSync(`${__dirname}/last_msgs.json`, JSON.stringify(msg_data))
        const data_str_for_send = cur_time.toLocaleDateString("fa-IR")
        await send_channel_msg(socket, data_str_for_send, channel_id)
        return
    }
    let cur_time = new Date()
    const time_str = `${cur_time.getMonth()}/${cur_time.getDate()}`
    console.log({ time_str });
    if (time_str !== last_msg_time) {
        const data_str_for_send = cur_time.toLocaleDateString("fa-IR")
        await send_channel_msg(socket, data_str_for_send, channel_id)
        msg_data[`_${channel_id}`] = time_str
        fs.writeFileSync(`${__dirname}/last_msgs.json`, JSON.stringify(msg_data))
    }
}


const send_channel_msg = async (socket, msg, channel_id) => {
    msg_cash(channel_id)
    let new_message = {
        msg_id: uid(6),
        user_id: "server",
        user_name: "server",
        user_image: "",
        user_state: "server",
        msg,
        msg_type: "server",
        msg_time: Date.now(),
    }
    await Channel.findOneAndUpdate({ id: channel_id }, { $push: { messages: new_message } })
    socket.to(channel_id).emit("send_channel_msg", { data: new_message })
}



module.exports = { check_last_msgs, check_last_msg, send_channel_msg }