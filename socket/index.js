const TempDb = require("../helper/temp_db")
const join_handler = require("./join_handler")
const find_match = require("./find_match")
const handel_disconnect = require("./disconnect")
const channel_socket_handler = require("./channel")
const online_users_handler = require("./online_users_handler")
const data_handler = require("../games_temp_data/data_handler")

const SocketProvider = class {

    constructor(io) {
        this.io = io
        this.db = new TempDb()
    }

    lunch() {


        channel_socket_handler.set_online_games()
        online_users_handler.reset()
        this.io.on("connection", (client) => {
            client.on("join", ({ token }) => { join_handler({ token, db: this.db, client, socket: this.io }) })
            client.on("find_match", ({ auth }) => { find_match.find_robot_game({ senario: "nato", client, db: this.db, socket: this.io, auth }) })
            client.on("leave_find", () => { find_match.leave_find({ client, db: this.db, socket: this.io }) })
            client.on("game_handle", ({ op, data }) => {
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
        })

    }

}



module.exports = SocketProvider



