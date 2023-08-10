const TempDb = require("../helper/temp_db")
const join_handler = require("./join_handler")
const find_match = require("./find_match")
const handel_disconnect = require("./disconnect")
const channel_socket_handler = require("./channel")
const SocketProvider = class {

    constructor(io) {
        this.io = io
        this.db = new TempDb()
    }

    lunch() {
        this.io.on("connection", (client) => {
            client.on("join", ({ token }) => { join_handler({ token, db: this.db, client, socket: this.io }) })
            client.on("find_match", (senario) => { find_match.find_robot_game({ senario, client, db: this.db, socket: this.io }) })
            client.on("leave_find", () => { find_match.leave_find({ client, db: this.db, socket: this.io }) })
            client.on("game_handle", ({ op, data }) => {
                let game_id = client.game_id
                let user_game = null
                if (game_id) { user_game = this.db.getOne("games", "game_id", game_id) }
                else {
                    const games = this.db.getAll("games")
                    user_game = games.find(game => {
                        let ids = game.users.map(user => user.user_id)
                        if (ids.includes(client.idenity.user_id)) {
                            client.game_id = game.game_id
                            return true
                        }
                    })
                }
                // console.log({user_game:user_game.game_id,op,data,client:client.idenity});
                if (!user_game) return
                user_game.game_class.player_action({ op, data, client })
            })
            client.on("channel_handle", ({ op, data }) => {
                channel_socket_handler[op]({ data: data, socket: this.io, client })
            })

            client.on("start_channel_game", ({ game_id })=>{
                let find_match_func=()=>{
                    find_match.find_robot_game({ senario:"nato", client, db: this.db, socket: this.io })
                }
                channel_socket_handler.start_channel_game({game_id,start_game:find_match_func})
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
        })

    }

}


module.exports = SocketProvider