const socket_handler = require("../../socket/online_users_handler")
const Dynamic_vars = require("./dynamic_vars")
const helper = require("./funcs/helper")
const { generate_player_status } = require("./funcs/players_status")
const speech = require("./funcs/speech")

const Game = class {
    constructor({ lobby_id, game_detail, socket }) {
        this.game_vars = new Dynamic_vars(game_detail)
        this.creator = game_detail.creator
        this.lobby_id = lobby_id
        this.socket = socket
        this.player_status = []
        this.players_permissions = []
        this.socket_finder = socket_handler.get_user_socket_id
        this.characters_list = []
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
                const new_permissions = {
                    user_id,
                    speech: false,
                    hand_rise: false,
                    day_act: false,
                    chat: false,
                    like_dislike: false,
                    challenge: false

                }
                this.player_status.push(new_permissions)
                this.socket.to(lobby_id).emit("players_status", { player_status: this.player_status })
                client.emit("permissions_status", { permissions: new_permissions })
                break
            }
            case ("start_game"): {
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

            }
        }
    }

    emit_to_creator(emit_name, data) {
        const { user_id } = this.creator
        const creator_socket_id = this.socket_finder(user_id)
        this.socket.to(creator_socket_id).emit(emit_name, data)

    }

}