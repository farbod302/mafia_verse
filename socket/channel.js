const { uid: uuid } = require("uid")
const Channel = require("../db/channel")
const User = require("../db/user")

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
    async send_channel_msg(data, socket, client, db) {
        const { channel_data, idenity } = client
        console.log({ channel_data });
        const { msg_type, msg } = data
        const { user_id } = idenity
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
        await Channel.findOneAndUpdate({ id: channel_data.channel_id }, { $push: { messages: new_msg } })

    },

    async create_game(data, socket, client, db) {
        const { channel_data, idenity } = client
        if (!channel_data || idenity.user_id) return socket.to(client.id).emit("error")
        const { user_id } = idenity
        let s_user = await User.findOne({ uid: user_id })
        if (!s_user) return socket.to(client.id).emit("error")
        const { gold, } = s_user
        if (gold < 100) return socket.to(client.id).emit("error_msg", { data: { msg: "شما سکه کافی ندارید" } })

        let game_id = uuid(4)

        let new_game = {
            game_id,
            creator: user_id,
            creator_socket: client.id,
            scenario: "nato",
            finished: false,
            started: false,
            observable: true,
            start_time: Date.now(),
            end_time: 0,
            winner: "",
            users: [{ ...idenity, side: "" }],
            requesters: []
        }
        await Channel.findOneAndUpdate({ id: channel_data.channel_id }, { $push: { games: new_game } })
        socket.to(channel_data.channel_id).emit("channel_game", { data: new_game })
        client.join(game_id)
    },

    async channel_game_update({ channel_id, game_id }) {
        let all_game = await Channel.findOne({ id: channel_id })
        let s_game = all_game.games.find(e => e.game_id === game_id)
        if (!s_game) return
        const { requesters, users } = s_game
        return { requesters, users, mod_socket: s_game.creator_socket }

    },


    async join_channel_game(data, socket, client, db) {
        const { game_id } = data
        const { idenity, channel_data } = client
        const { channel_id } = channel_data
        await Channel.findOneAndUpdate(
            {
                id: channel_id,
                games:
                    { $elemMatch: { game_id } }
            },
            {
                $push: { "games.$.requesters": idenity.user_id }
            }
        )
        let new_update = await this.channel_game_update({ channel_id, game_id })
        const { requesters, users, mod_socket } = new_update
        let requesters_comp_data = await User.find({ uid: requesters }, { idenity: 1, avatar: 1, uid: 1, _id: 0 })
        requesters_comp_data = requesters_comp_data.map(u => {
            return {
                user_id: u.uid,
                user_name: u.idenity.name,
                user_image: u.avatar.avatar
            }
        })
        socket.to(mod_socket).emit("request_channel_game_join", { data: requesters_comp_data })
        socket.to(game_id).emit("online_game_update", { data: { game_id, requesters, users } })
    },

    async leave_channel_game(data, socket, client, db) {
        const { game_id } = data
        const { channel_data } = client
        const { channel_id } = channel_data
        await Channel.findOneAndUpdate(
            {
                id: channel_id,
                games:
                    { $elemMatch: { game_id } }
            },
            {
                $pull: { "games.$.requesters": idenity.user_id }
            }
        )
        let new_update = await this.channel_game_update({ channel_id, game_id })
        const { requesters, users } = new_update
        socket.to(game_id).emit("online_game_update", { data: { game_id, requesters, users } })

    },


    async filter_channel_game_users(data, socket, client, db) {
        const { requester_id, accept, game_id } = data
        const { channel_data } = client
        const { channel_id } = channel_data
        await Channel.findOneAndUpdate(
            {
                id: channel_id,
                games:
                    { $elemMatch: { game_id } }
            },
            {
                $pull: { "games.$.requesters": requester_id }
            }
        )
        if (accept) {
            let requester_comp_data = await User.findOne({ uid: requester_id }, { idenity: 1, avatar: 1, uid: 1, _id: 0 })
            requester_comp_data = requester_comp_data.map(u => {
                return {
                    user_id: u.uid,
                    user_name: u.idenity.name,
                    user_image: u.avatar.avatar
                }
            })
            await Channel.findOneAndUpdate(
                {
                    id: channel_id,
                    games:
                        { $elemMatch: { game_id } }
                },
                {
                    $push: { "games.$.users": requester_comp_data }
                }
            )
        }
        let new_update = await this.channel_game_update({ channel_id, game_id })
        const { requesters, users } = new_update
        socket.to(game_id).emit("online_game_update", { data: { game_id, requesters, users } })

    }


}

module.exports = channel_socket_handler