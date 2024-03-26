const TempDb = require("../helper/temp_db")
const join_handler = require("./join_handler")
const find_match = require("./find_match")
const handel_disconnect = require("./disconnect")
const channel_socket_handler = require("./channel")
const online_users_handler = require("./online_users_handler")
const data_handler = require("../games_temp_data/data_handler")
const LocalGame = require("../games/local")
const { uid } = require("uid")
const Jwt = require("../helper/jwt")
const fs = require("fs")
const monitoring = require("../container/monitoring")
const User = require("../db/user")
const lobby = require("./lobby")
const CustomGame = require("../games/custom/game")
const Voice = require("../helper/live_kit_handler")
const Helper = require("../helper/helper")
const SocketProvider = class {

    constructor(io) {
        this.io = io
        this.db = new TempDb()
        this.lobby_speech_status = {}
        const broadcast_speech_status = (lobby_id) => {
            const speech_status = this.lobby_speech_status[lobby_id]
            if (!speech_status) return
            io.to(lobby_id).emit("lobby_speech_status", speech_status)
        }
        const remove_player_from_lobby_speech_status = (lobby_id, user_id) => {
            if (!this.lobby_speech_status[lobby_id]) return
            this.lobby_speech_status[lobby_id] = this.lobby_speech_status[lobby_id].filter(e => e.user != user_id)
            broadcast_speech_status(lobby_id)
            console.log(this.lobby_speech_status);
        }
        this.remove_player_from_lobby_speech_status = remove_player_from_lobby_speech_status
        this.broadcast_speech_status = broadcast_speech_status
    }



    lunch() {
        channel_socket_handler.set_online_games()
        online_users_handler.reset()
        lobby.reset_list()
        setInterval(() => {
            const games = this.db.getAll("games")
            monitoring.set_games(games.length)
        }, 2000)
        this.io.on("connection", (client) => {
            client.on("join", ({ token }) => { join_handler({ token, db: this.db, client, socket: this.io }) })
            client.on("find_match", ({ auth }) => { find_match.find_robot_game({ senario: "nato", client, db: this.db, socket: this.io, auth }) })
            client.on("leave_find", () => { find_match.leave_find({ client, db: this.db, socket: this.io }) })
            client.on("game_handle", ({ op, data }) => {
                try {
                    let game_id = client.game_id
                    let user_game = null
                    if (game_id) { user_game = this.db.getOne("games", "game_id", game_id) }
                    else {
                        const games = this.db.getAll("games")
                        user_game = games.find(game => {
                            let users = game.game_class.get_users()
                            users = users.filter(e => !e.is_alive || e.is_alive !== "dead")
                            let ids = users.map(user => user.user_id)
                            if (game.mod) {
                                ids = ids.concat(game.mod)
                            }
                            if (ids.includes(client.idenity.user_id)) {
                                client.game_id = game.game_id
                                return true
                            }
                        })
                    }
                    if (!user_game) return
                    data_handler.add_data(user_game.game_id, { user: client.idenity.user_id, op, received_data: data })
                    user_game.game_class.player_action({ op, data, client })
                }
                catch {
                    client.emit("abandon")
                }
            })
            client.on("channel_handle", ({ op, data }) => {
                channel_socket_handler[op]({ data: data, socket: this.io, client })
            })

            client.on("start_channel_game", ({ game_id }) => {

                channel_socket_handler.start_channel_game({
                    client,
                    game_id,
                    db: this.db,
                    socket: this.io
                })
            })

            client.on("disconnect", () => {
                handel_disconnect({ client, db: this.db, socket: this.io, remove_player_from_lobby_speech_status: this.remove_player_from_lobby_speech_status })
            })
            client.on("game_history", () => { })
            client.on("reconnect", ({ game_id }) => {
                let s_game = this.db.getOne("games", "game_id", game_id)
                if (!s_game) return client.emit("game_is_end")
                else {
                    console.log("reonnect to game");

                    client.join(game_id)
                }
            })
            client.on("abandon", () => {

                let game_id = client.game_id
                let user_game = null
                if (game_id) { user_game = this.db.getOne("games", "game_id", game_id) }
                else {
                    const games = this.db.getAll("games")
                    user_game = games.find(game => {
                        let ids = game.users.map(user => user.user_id)
                        if (ids.includes(client.idenity.user_id)) {
                            return true
                        }
                    })
                }
                // console.log({user_game:user_game.game_id,op,data,client:client.idenity});
                if (!user_game) return
                console.log({ user_game });
                client.game_id = ""
                user_game.game_class.player_abandon({ client: client.idenity })
            })

            client.on("user_end_game", () => {
                setTimeout(() => {
                    const game_id = client.game_id
                    if (!game_id) return
                    client.leave(game_id)
                    client.game_id = null
                }, 1000 * 60 * 2)
            })

            client.on("monitoring", ({ token }) => {
                const user_data = Jwt.verify(token)
                if (user_data) {
                    const { uid } = user_data
                    const admins_list = fs.readFileSync(`${__dirname}/../helper/admins.json`)
                    const admins = JSON.parse(admins_list.toString())
                    if (admins.includes(uid)) {
                        client.join("monitoring")
                    }
                }
            })

            client.on("create_local_game", (data) => {
                const { player_count } = data
                console.log({ data });
                const { idenity } = client
                const game_id = uid(4)
                client.local_game_id = game_id

                const new_local_game = new LocalGame(idenity, +player_count, this.io, game_id, this.db)
                this.db.add_data("local_game", { game_class: new_local_game, local_game_id: game_id })
            })

            client.on("handle_local_game", ({ op, data }) => {
                if (data?.game_id) client.local_game_id = data.game_id
                const { local_game_id } = client
                const s_game = this.db.getOne("local_game", "local_game_id", local_game_id)
                if (!s_game) return client.emit("error", { data: { msg: "شناسه بازی نامعتبر است" } })
                s_game.game_class.game_handler(client, op, data)
            })

            client.on("test", (data) => {
                console.log({ data });
                this.io.emit("test_res", { data })
            })


            client.on("user_gold", async ({ token }) => {
                const user = Jwt.verify(token)
                const { uid } = user
                const selected_user = await User.findOne({ uid })
                if (selected_user) {
                    const { gold } = selected_user
                    client.emit("user_gold", { data: { gold } })
                }

            })

            client.on("app_detail", () => {
                const version = fs.readFileSync(`${__dirname}/../version.json`)
                const { v } = JSON.parse(version.toString())
                client.emit("app_detail", { data: { v, server_update: false } })
            })

            client.on("create_lobby", async (data) => {
                const lobby_id = await lobby.create_lobby(client, data, this.io)
                client.idenity.lobby_id = lobby_id
                client.idenity.lobby_creator = client.idenity.user_id
                this.lobby_speech_status[lobby_id] = [{ user: client.idenity.user_id, speech: false }]
                const lobby_token = Voice.join_room(client.idenity.user_id, `${lobby_id}_lobby`)
                this.io.to(lobby_id).emit("lobby_create_result", { lobby_id, is_free: true, token: lobby_token })
                await Helper.delay(1)
                this.broadcast_speech_status(lobby_id)
                console.log(this.lobby_speech_status);

            })

            client.on("lobby_list", () => {
                const lobby_list = lobby.get_lobby_list()
                this.io.to(client.id).emit("lobby_list", { lobby_list })


            })
            client.on("join_lobby", async (data) => {
                let s_user = await User.findOne({ uid: client.idenity.user_id })
                if (s_user) {
                    const name = s_user.idenity.name
                    const image = `files/${s_user.avatar.avatar}`
                    client.idenity.name = name
                    client.idenity.image = image
                }
                const result = lobby.join_lobby({ ...data, client, socket: this.io })
                if (!result.status) return client.emit("err", { msg: result.msg })
                const { creator_id } = result
                client.idenity.lobby_creator = creator_id
                const lobby_token = Voice.join_room(client.idenity.user_id, `${data.lobby_id}_lobby`)
                lobby.send_message_to_lobby({ client, lobby_id: data.lobby_id, msg: "به لابی پیوست", is_system_msg: true, socket: this.io, })
                client.emit("lobby_join_result", { ...result, token: lobby_token, is_free: true })
                if (result.status) {
                    const { lobby_id } = result
                    client.idenity.lobby_id = lobby_id
                    this.lobby_speech_status[lobby_id].push({ user: s_user.uid, speech: false })
                    this.broadcast_speech_status(lobby_id)

                }
                console.log(this.lobby_speech_status);

            })

            client.on("lobby_detail", ({ lobby_id }) => {
                const lobby_detail = lobby.get_lobby_list(false)
                const selected_lobby = lobby_detail.find(e => e.lobby_id === lobby_id)
                if (!selected_lobby) client.emit("lobby_detail", { status: false, msg: "لابی یافت نشد", data: {} })
                client.emit("lobby_detail", { status: true, msg: "", data: selected_lobby })
            })

            client.on("kick_user_from_lobby", (data) => {
                const result = lobby.kick_player({ ...data, client, socket: this.io })
                this.io.to(client.id).emit("lobby_kick_result", { result })
                this.lobby_speech_status[data.lobby_id] = this.lobby_speech_status[data.lobby_id].filter(e => e.user !== data.player_to_kick)
                this.broadcast_speech_status(data.lobby_id)
                console.log(this.lobby_speech_status);


            })
            client.on("leave_lobby", (data) => {
                console.log("call");
                lobby.leave_lobby({ ...data, client, socket: this.io })
                const lobby_id = client.idenity.lobby_id
                console.log(lobby_id);
                if (lobby_id) {
                    this.lobby_speech_status[lobby_id] = this.lobby_speech_status[lobby_id].filter(e => e.user !== client.idenity.user_id)
                    this.broadcast_speech_status(lobby_id)
                    console.log(this.lobby_speech_status);

                }

            })
            client.on("waiting_lobby_message", ({ message, lobby_id }) => {
                lobby.send_message_to_lobby({ client, lobby_id, msg: message, is_system_msg: false, socket: this.io, })
            })
            client.on("start_custom_game", (data) => {
                const { lobby_id } = data
                const lobby_list = lobby.get_lobby_list(true)
                const selected_lobby_index = lobby_list.findIndex(e => e.lobby_id === lobby_id)
                if (selected_lobby_index === -1) return client.emit("error", { msg: "لابی یافت نشد" })
                const { player_cnt, players, creator, started } = lobby_list[selected_lobby_index]
                if (player_cnt != players.length) return client.emit("error", { msg: "ظرفیت بازی هنوز تکمیل نشده" })
                if (started) return client.emit("error", { msg: "بازی قبلا شروع شده" })
                const { user_id } = client.idenity
                if (user_id !== creator.user_id) return client.emit("error", { msg: "شما دسترسی لازم برای شروع بازی را ندارید" })
                const new_custom_game = new CustomGame({
                    lobby_id,
                    game_detail: lobby_list[selected_lobby_index],
                    socket: this.io
                })
                lobby_list[selected_lobby_index].started = true
                lobby.update_lobbies(lobby_list)
                this.io.to(lobby_id).emit("custom_game_created")
                this.db.add_data("custom_game", { game_class: new_custom_game, lobby_id })
            })
            client.on("custom_game_handler", ({ op, data, lobby_id }) => {
                const selected_lobby_id = client.idenity.lobby_id || lobby_id
                if (!client.idenity.lobby_id && lobby_id) {
                    client.idenity.lobby_id = lobby_id
                    client.join(lobby_id)
                }
                if (!selected_lobby_id) return console.log("no lobby id");
                const selected_lobby = this.db.getOne("custom_game", "lobby_id", selected_lobby_id)
                if (!selected_lobby) return client.emit("err", { msg: "لابی یافت نشد" })
                selected_lobby.game_class.game_handler({ client, op, data })
            })

            client.on("delete_lobby", ({ lobby_id }) => {
                delete this.lobby_speech_status[lobby_id]
                console.log(this.lobby_speech_status);
                lobby.remove_lobby({
                    lobby_id,
                    client,
                    socket: this.io
                })
            })

        })

    }

}



module.exports = SocketProvider



