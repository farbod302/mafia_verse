const Helper = require("../../helper/helper")
const socket_handler = require("../../socket/online_users_handler")
const Dynamic_vars = require("./dynamic_vars")
const helper = require("./funcs/helper")
const { generate_player_status } = require("./funcs/players_status")
const speech = require("./funcs/speech")
const static_vars = require("./funcs/static_vars")
const CustomGame = class {
    constructor({ lobby_id, game_detail, socket }) {
        this.game_vars = new Dynamic_vars(game_detail)
        this.creator = game_detail.creator
        this.lobby_id = lobby_id
        this.socket = socket
        this.player_status = []
        this.players_permissions = []
        this.socket_finder = socket_handler.get_user_socket_id
        this.characters_list = []
        this.act_record=[]
    }

    async game_handler({ op, data, client }) {
        switch (op) {
            case ("ready_to_game"): {
                const { user_id } = client
                const { lobby_id } = this
                const livekit_token = await speech.create_join_token({ user_id, lobby_id: this.lobby_id })
                client.emit("livekit_token", { token: livekit_token })
                const is_already_connected = this.player_status.find(u => u.user_id === user_id)
                if (is_already_connected) return
                const player_status = generate_player_status({ user_id: client.user_id })
                const cur_length = this.player_status.length
                this.player_status.push({
                    ...client,
                    index: cur_length + 1,
                    ...player_status
                })
                const new_permissions = { ...static_vars.permissions }
                client.emit("permissions_status", { permissions: new_permissions })
                this.players_permissions.push(new_permissions)
                if (this.players_permissions.length >= this.game_detail.player_cnt) {
                    if (this.all_join) return
                    this.all_join = true
                    this.socket.to(lobby_id).emit("all_players_status", { player_status: this.player_status })
                }
                break
            }
            case ("start_game"): {
                const { lobby_id, started } = this
                if (started) return
                this.started = true
                this.to(lobby_id).emit("game_started")
                await Helper.delay(4)
                const shuffled_carts = helper.shuffle_carts(this.game_detail.characters)
                const cur_player_status = [...this.player_status]
                for (let user of cur_player_status) {
                    const { index, user_id } = user
                    const selected_cart = shuffled_carts[index - 1]
                    const socket_id = this.socket_finder(user_id)
                    this.socket.to(socket_id).emit("selected_character", { character: selected_cart })
                    this.characters_list.push({
                        user_id,
                        user,
                        character: selected_cart
                    })
                }
                this.emit_to_creator("players_characters", { characters: this.characters_list })
                break
            }
            case ("change_permission"): {
                const { users, permission, new_status } = data
                const { players } = this.game_vars
                let selected_users = []
                if (!users || !users.length) selected_users = players.map(e => e.user_id)
                for (let player of selected_users) {
                    const socket_id = this.socket_finder(player)
                    const cur_permissions = this.players_permissions.findIndex(e => e.user_id === player)
                    if (cur_permissions === -1) continue
                    console.log({ cur_permissions });
                    const new_permission_status = { ...this.player_status[cur_permissions] }
                    new_permission_status[permission] = new_status
                    this.socket.to(socket_id).emit("permissions_status", new_permission_status)
                    this.players_permissions[cur_permissions] = new_permission_status
                }
            }
            case ("user_action"): {
                const { action, new_status, auto_turn_off } = data
                const { user_id } = client.idenity
                const user_cur_status = this.player_status.findIndex(e => e.user_id == user_id)
                this.player_status[user_cur_status][action] = new_status
                const { lobby_id } = this
                this.socket.to(lobby_id).emit("player_status", { user_cur_status })
                if (auto_turn_off) {
                    setTimeout(() => {
                        this.player_status[user_cur_status][action] = false
                    }, 2000)
                }
            }
        }
    }

    emit_to_creator(emit_name, data) {
        const { user_id } = this.creator
        const creator_socket_id = this.socket_finder(user_id)
        this.socket.to(creator_socket_id).emit(emit_name, data)

    }

}


module.exports=CustomGame