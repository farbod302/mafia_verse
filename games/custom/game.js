const { uid } = require("uid")
const Helper = require("../../helper/helper")
const socket_handler = require("../../socket/online_users_handler")
const Dynamic_vars = require("./dynamic_vars")
const helper = require("./funcs/helper")
const { generate_player_status } = require("./funcs/players_status")
const speech = require("./funcs/speech")
const static_vars = require("./funcs/static_vars")
const fs = require("fs")
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
        this.act_record = []
        this.last_cards = game_detail.map(card => { return { ...card, used: false, id: uid(3) } })
        this.game_event = "day"
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
                    ...player_status,
                })
                const new_permissions = { ...static_vars.permissions, user_id }
                client.emit("permissions_status", { permissions: new_permissions })
                this.players_permissions.push(new_permissions)
                if (this.players_permissions.length >= this.game_detail.player_cnt) {
                    if (this.all_join) return
                    this.all_join = true
                    this.socket.to(lobby_id).emit("all_players_status", { players_status: this.player_status })
                }
                break
            }
            case ("start_game"): {
                const { lobby_id, started } = this
                if (started) return
                this.started = true
                this.to(lobby_id).emit("game_started")
                await Helper.delay(4)
                let deck = []
                const default_card_json = fs.readFileSync("../local/clean_deck.json")
                const default_card = JSON.parse(default_card_json.toString())
                this.game_detail.characters.forEach(cart => {
                    const { side, id, count, name } = cart
                    const selected_card = default_card.find(e => e.id === id)
                    const card_to_add = {
                        name,
                        side,
                        image: selected_card.icon,
                    }
                    const arr_to_add = new Array(count).fill(card_to_add)
                    deck = deck.concat(arr_to_add)
                })
                const shuffled_card = helper.shuffle_card(deck)
                const cur_player_status = [...this.player_status]
                for (let user of cur_player_status) {
                    const { index, user_id } = user
                    const selected_cart = shuffled_card[index - 1]
                    const socket_id = this.socket_finder(user_id)
                    this.socket.to(socket_id).emit("selected_character", { character: selected_cart })
                    this.characters_list.push({
                        user_id,
                        user,
                        character: selected_cart,
                        side: selected_cart.side
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
                    const new_permission_status = { ...this.player_status[cur_permissions] }
                    new_permission_status[permission] = new_status
                    this.socket.to(socket_id).emit("permissions_status", { permission_status: new_permission_status })
                    this.players_permissions[cur_permissions] = new_permission_status
                }
                break
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
                break
            }
            case ("activate_last_move_card"): {
                const { target_player } = data
                const remain_cards = this.last_cards.filter(e => !e.used)
                if (!remain_cards.length) client.emit("err", { status: false, msg: "کارت حرکت آخری باقی نمانده است" })
                this.change_custom_users_permissions({
                    users: [target_player],
                    permission: "last_move_card",
                    new_status: true
                })
            }
            case ("last_move_card"): {
                const random_index = Math.floor(Math.random() * remain_cards.length)
                const selected_card = remain_cards[random_index]
                const { id, name } = selected_card
                const index_from_main_array = this.last_cards.findIndex(e => e.id === id)
                this.last_cards[index_from_main_array].used = true
                const { lobby_id, socket } = this
                socket.to(lobby_id).emit("last_move_card_result", { name })
                this.change_custom_users_permissions({
                    users: [client.user_id],
                    permission: "last_move_card",
                    new_status: false
                })
                break
            }
            case ("change_all_users_permissions"): {
                const { permission, new_status } = data
                this.change_all_users_permissions({ permission, new_status })
                break
            }
            case ("change_game_event"): {
                const { new_game_event } = data
                this.game_event = new_game_event
                const { socket, lobby_id } = this
                socket.to(lobby_id).emit("game_event", { game_event: new_game_event })
            }
        }
    }

    emit_to_creator(emit_name, data) {
        const { user_id } = this.creator
        const creator_socket_id = this.socket_finder(user_id)
        this.socket.to(creator_socket_id).emit(emit_name, data)
    }


    change_all_users_permissions({ permission, new_status }) {
        const cur_permissions = this.players_permissions
        const updated_permissions = cur_permissions.map((player, index) => {
            const player_socket = this.socket_finder(player.user_id)
            const player_cur_permission = { ...permission }
            player_cur_permission[permission] = new_status
            this.socket.to(player_socket).emit("permissions_status", { permission_status: player_cur_permission })
            return player_cur_permission
        })
        this.players_permissions = updated_permissions
    }

    change_custom_users_permissions({ users, permission, new_status }) {
        const cur_permissions = this.players_permissions
        cur_permissions.forEach((player, index) => {
            if (!users.includes(player.user_id)) return
            const player_socket = this.socket_finder(player.user_id)
            const player_cur_permission = { ...permission }
            player_cur_permission[permission] = new_status
            this.socket.to(player_socket).emit("permissions_status", { permission_status: player_cur_permission })
            this.players_permissions[index][permission] = new_status
        })
        this.players_permissions = updated_permissions
    }
    update_players_status() {
        const { socket, lobby_id } = this
        socket.to(lobby_id).emit("all_players_status", { players_status: this.player_status })
        this.players_permissions.forEach(p => {
            const { user_id } = p
            const player_socket_id = this.socket_finder(user_id)
            socket.to(player_socket_id).emit("permissions_status", { permission_status: p })
        })
        this.characters_list.forEach(p => {
            const { user_id } = p
            const player_socket_id = this.socket_finder(user_id)
            socket.to(player_socket_id).emit("selected_character", { character: p })
        })
    }


    night_acts_handler({ changes }) {
        changes.forEach(change => {
            const { target, operation, new_value } = change
            const player_status_index = this.player_status.findIndex(e => e.user_id === target)
            const characters_list_index = this.characters_list.findIndex(e => e.user_id === characters_list)
            switch (operation) {
                case ("kill"): {
                    //lock all permissions
                    const all_permissions = Object.keys(static_vars.permissions)
                    all_permissions.forEach(p => this.change_custom_users_permissions({
                        users: [target],
                        permission: p,
                        new_status: false
                    }))
                    this.player_status[player_status_index].alive = false
                    break
                }
                case ("alive"): {
                    this.player_status[player_status_index].alive = false
                    break
                }
                case ("change_side"): {
                    this.characters_list[characters_list_index].side = new_value
                    break
                }
                case ("change_character"): {
                    this.characters_list[characters_list_index].character = new_value
                }
            }
        })
    }

}


module.exports = CustomGame