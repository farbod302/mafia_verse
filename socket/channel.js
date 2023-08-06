const { uid:uuid } = require("uid")
const Channel = require("../db/channel")

const channel_socket_handler = {

    async join_to_channel(data, socket, client) {
        const { channel_id } = data
        const { idenity } = client
        const { user_id } = idenity
        const prv_channel = client.channel_data?.channel_id
        if (prv_channel) client.leave(prv_channel)
        client.join(channel_id)
        let s_channel = await Channel.findOne({ id: channel_id })
        const { mods, creator } = s_channel
        let channel_data = {
            channel_id
        }
        if (mods.includes(user_id)) { channel_data["role"] = "co_leader" }
        else if (creator === user_id) { channel_data["role"] = "leader" }
        else channel_data["role"] = "member"
        client.channel_data = channel_data
    },
    async send_channel_msg(data, socket, client) {
        const { channel_data, idenity } = client
        console.log({channel_data});
        const { msg_type, msg } = data
        const {user_id}=idenity
        let msg_id = uuid(5)
        let new_msg = {
            msg_id,
            user_id,
            user_name: idenity.name || "",
            msg,
            msg_type,
            msg_time: Date.now(),
            user_state: channel_data.role
        }
        socket.to(channel_data.channel_id).emit("send_channel_msg", { data: new_msg })
        await Channel.findOneAndUpdate({id:channel_data.channel_id},{$push:{messages:new_msg}})

    }


}

module.exports = channel_socket_handler