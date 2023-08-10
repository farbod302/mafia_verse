const { uid: uuid } = require("uid")
const Channel = require("../db/channel")
const User = require("../db/user")

const channel_socket_handler = {

    channel_games_db: [],
    ready_check_list: [],

    async create_game({ data, client, socket }) {
        const { entire_gold } = data
        const { channel_data, idenity } = client
        const { channel_id } = channel_data
        const game_id = uuid(5)

        let new_game = {
            game_id,
            creator_id: idenity.use_id,
            scenario: "nato",
            entire_gold,
            finished: false,
            started: false,
            observable: true,
            start_time: Date.now(),
            winner: "",
            users: [
                {
                    ...idenity,
                    accepted: true,
                    side: ""
                }
            ],
        }
        await Channel.findOneAndUpdate(
            { id: channel_id },
            {
                $push: {
                    games: new_game
                }
            }
        )
        this.channel_games_db.push({ game_id, channel_id: channel_id, game_data: new_game })
        socket.to(channel_id).emit("online_game", { data: new_game })
    },

    update_game({ game_id, socket }) {
        let s_game = this.channel_games_db.find(game => game.game_id == game_id)
        socket.to(s_game.channel_id).emit("online_game_update", { data: { users: s_game.users, game_id } })
    },
    async update_game_on_db({ channel_id, game_id, new_data }) {
        await Channel.findOneAndUpdate({
            id: channel_id,
            games: { $elemMatch: { game_id } }
        }, {
            $set: {
                "games.$": new_data
            }
        })
    },

    pick_game({ game_id }) {
        let s_game_index = this.channel_games_db.findIndex(game => game.game_id == game_id)
        return { s_game: this.channel_games_db[s_game_index], index: s_game_index }
    },

    async join_channel_game({ data, client, socket }) {
        const { game_id } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        if (s_game.game_data.start) return socket.to(client.id).emit("channel_report", { data: { msg: "بازی شروع شده" } })
        let prv_game_data = { ...s_game }
        prv_game_data.game_data.users.push({ ...client.idenity, accepted: false, side: "" })
        this.channel_games_db[index].game_data = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },

    async leave_channel_game({ data, client, socket }) {
        const { game_id } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        let prv_game_data = { ...s_game }
        prv_game_data.game_data.users.filter(e => e.user_id === client.user_id)
        this.channel_games_db[index].game_data = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },

    async filter_channel_game_users({ data, client, socket }) {
        const { game_id, requester_id, accept } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        let prv_game_data = { ...s_game }
        let user_index = prv_game_data.game_data.users.findIndex(e => e.user_id === requester_id)
        prv_game_data.game_data.users[user_index].accepted = accept
        this.channel_games_db[index].game_data = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },
    async ready_check({ data, client }) {
        const { game_id } = data
        let { s_game } = this.pick_game({ game_id })
        const { users } = s_game.game_data
        let accepted_users = users.filter(e => e.accepted)
        accepted_users.forEach(user => client.to(user.socket_id).emit("ready_check"))
        this.ready_check_list.push({
            game_id,
            users: accepted_users.map(e => { return { user_id: e.user_id, ready_check: -1 } }),
        })
        await new Promise(resolve => { setTimeout(resolve, 11000) })
        this.ready_check_list = this.ready_check_list.filter(e => e.game_id !== game_id)
    },

    async ready_check_status({ client, data }) {
        const { game_id, status } = data
        let s_ready_index = this.ready_check_list.findIndex(e => e.game_id === game_id)
        if (s_ready_index === -1) return
        let user_index = this.ready_check_list[s_ready_index].users.findIndex(e => e.user_id === client.idenity.use_id)
        if (user_index === -1) { console.log("err"); return }
        this.ready_check_list[s_ready_index].users[user_index].ready_check = status ? 1 : 0
        let { s_game } = this.pick_game({ game_id })
        const { users } = s_game.game_data
        let accepted_users = users.filter(e => e.accepted)
        accepted_users.forEach(user=>{
            socket.to(user.socket_id).emit("ready_check_status",{data:this.ready_check_list[s_ready_index].users})
        })
    },

    async start_channel_game({game_id,start_game}){

    }



}

module.exports = channel_socket_handler