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

const SocketProvider = class {

    constructor(io) {
        this.io = io
        this.db = new TempDb()
    }



    lunch() {
        channel_socket_handler.set_online_games()
        online_users_handler.reset()
        setInterval(() => {
            const games = this.db.getAll("games")
            monitoring.set_games(games.length)
        }, 2000)
        this.io.on("connection", (client) => {
            client.on("join", ({ token }) => { join_handler({ token, db: this.db, client, socket: this.io }) })
            client.on("find_match", ({ auth }) => { find_match.find_robot_game({ senario: "nato", client, db: this.db, socket: this.io, auth }) })
            client.on("leave_find", () => { find_match.leave_find({ client, db: this.db, socket: this.io }) })
            client.on("game_handle", ({ op, data }) => {
                let game_id = client.game_id
                console.log({client:client.idenity});
                if (!client.idenity) return client.emit("abandon")
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
                handel_disconnect({ client, db: this.db, socket: this.io })
            })
            client.on("game_history", () => { })
            client.on("reconnect", ({ game_id }) => {
                let s_game = this.db.getOne("games", "game_id", game_id)
                if (!s_game) return client.emit("game_is_end")
                else {
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

            client.on("create_local_game", ({ player_count }) => {
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

        })

    }

}



module.exports = SocketProvider



