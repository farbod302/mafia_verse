const { uid } = require("uid")
const Helper = require("../../helper/helper")
const socket_handler = require("../../socket/online_users_handler")
const Dynamic_vars = require("./dynamic_vars")
const helper = require("./funcs/helper")
const { generate_all_players_status } = require("./funcs/players_status")
const speech = require("./funcs/speech")
const static_vars = require("./funcs/static_vars")
const fs = require("fs")
const lobby = require("../../socket/lobby")
const CustomGame = class {
    constructor({ lobby_id, game_detail, socket }) {
        this.game_vars = new Dynamic_vars(game_detail)
        this.creator = game_detail.creator
        this.lobby_id = lobby_id
        this.socket = socket
        this.socket_finder = socket_handler.get_user_socket_id
        this.characters_list = []
        this.creator_messages = []
        this.act_record = []
        this.observer = 0
        this.creator_status = {
            speech: false,
            connected: false
        }
        this.last_cards = game_detail.cards.map(card => { return { ...card, used: false, id: uid(3) } })
        this.game_event = "day"
        speech.create_room({ lobby_id })
        const { players } = game_detail
        let deck = []
        const default_card_json = fs.readFileSync(`${__dirname}/../local/clean_deck.json`)
        const default_card = JSON.parse(default_card_json.toString())
        game_detail.characters.forEach(cart => {
            const { id, count, name, custom_side } = cart
            const selected_card = default_card.find(e => e.id === id)
            const card_to_add = {
                name,
                side: helper.translate_side(custom_side || selected_card.side),
                image: selected_card?.icon || "",
                used: false
            }
            const arr_to_add = new Array(count).fill(card_to_add)
            deck = deck.concat(arr_to_add)
        })
        let sides = deck.map(e => e.side)
        sides = game_detail.sides.concat(sides)
        sides = [...new Set(sides)]
        this.sides = sides
        const shuffled_card = helper.shuffle_card(deck)
        const statuses = generate_all_players_status({ players, characters: shuffled_card })
        this.player_status = statuses
        const all_permissions = players.map((p, index) => {
            return {
                user_id: p.user_id,
                user_index: index + 1,
                ...static_vars.permissions
            }
        })
        this.players_permissions = all_permissions
        this.game_detail = game_detail

    }

    submit_player_disconnect({ user_id }) {
        const { creator, socket, lobby_id } = this
        if (creator.user_id === user_id) {
            this.creator_status.connected = false
            socket.to(lobby_id).emit("creator_status", { creator_status: this.creator_status })
        } else {
            const { socket, lobby_id } = this
            const index = this.player_status.findIndex(e => e.user_id === user_id)
            if (index === -1) {
                this.observer--
                socket.to(lobby).emit("observer", { observer: this.observer })
                return
            }
            this.player_status[index]["connected"] = false
            socket.to(lobby_id).emit("player_status_update", { ...this.player_status.status, user_id })
        }
    }

    async game_handler({ op, data, client }) {
        console.log({ op, data, client: client.idenity });
        switch (op) {
            case ("ready_to_game"): {
                await Helper.delay(3)
                const { user_id } = client.idenity
                const { lobby_id } = this
                const livekit_token = await speech.create_join_token({ user_id, lobby_id: this.lobby_id })
                client.emit("livekit_token", { token: livekit_token })
                const is_creator = this.game_detail.creator.user_id === user_id
                if (!is_creator) {
                    const user_permission = this.players_permissions.find(e => e.user_id === user_id)
                    if (user_permission) {
                        client.emit("permissions_status", { permissions: user_permission })
                        const player_index = this.player_status.findIndex(e => e.user_id === user_id)
                        if (player_index === -1) {
                            this.observer++
                            socket.to(lobby).emit("observer", { observer: this.observer })
                            client.emit("all_players_status", { players_status: this.player_status })
                            client.emit("creator_status", { creator_status: this.creator_status })
                            client.emit("game_event", { game_event: new_game_event })

                            return
                        }
                        this.player_status[player_index].connected = true
                        client.to(lobby_id).emit("player_status_update", { ...this.player_status[player_index].status, user_id })
                    }
                } else {
                    this.creator_status.connected = true
                    client.emit("all_players_permissions", { players_permission: this.players_permissions })
                    this.socket.to(lobby_id).emit("creator_status", { creator_status: this.creator_status })
                    client.emit("messages_box", { messages: this.messages })
                }
                client.emit("all_players_status", { players_status: this.player_status })
                client.emit("creator_status", { creator_status: this.creator_status })
                client.emit("game_event", { game_event: new_game_event })


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
            case ("change_multi_permission"): {
                const { user_id, permissions } = data
                const selected_user_permissions = this.players_permissions.findIndex(e => e.user_id === user_id)
                for (let p of permissions) {
                    this.players_permissions[selected_user_permissions][p.permission] = p.status
                }
                client.emit("all_players_permissions", { players_permission: this.players_permissions })
                const player_socket = this.socket_finder(user_id)
                client.to(player_socket).emit("permissions_status", { permission_status: this.players_permissions[selected_user_permissions] })
                break
            }
            case ("user_action"): {
                const { action, new_status, auto_turn_off } = data
                const { user_id } = client.idenity
                const user_cur_status = this.player_status.findIndex(e => e.user_id == user_id)
                this.player_status[user_cur_status].status[action] = new_status
                const { status } = this.player_status[user_cur_status]
                const { lobby_id } = this
                this.socket.to(lobby_id).emit("player_status_update", { ...status, user_id })
                if (auto_turn_off) {
                    this.player_status[user_cur_status].status[action] = false
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
                break
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
                break
            }
            case ("change_player_status"): {
                const { target_player, selected_status, new_value } = data
                const { socket, lobby_id } = this
                const index = this.player_status.findIndex(e => e.user_id === target_player)
                this.player_status[index][selected_status] = new_value
                socket.to(lobby_id).emit("player_status_update", { ...this.player_status.status, user_id: target_player })
                if (selected_status === "alive" && new_value === false) {
                    const selected_user_permissions = this.players_permissions.findIndex(e => e.user_id === target_player)
                    const keys = Object.keys(this.players_permissions[selected_user_permissions])
                    keys.forEach(e => {
                        this.players_permissions[selected_user_permissions][e] = false
                    })
                    const player_socket = this.socket_finder(target_player)
                    client.to(player_socket).emit("permissions_status", { permission_status: this.players_permissions[selected_user_permissions] })
                }
                break
            }
            case ("flick"): {
                const { target_player } = data
                const socket_id = this.socket_finder(target_player)
                client.to(socket_id).emit("flick")
            }

            case ("send_message_to_mod"): {
                const { user_id } = client.idenity
                const new_message = {
                    sender: user_id,
                    content: data.content
                }
                this.creator_messages.push(new_message)
                const { user_id: creator_id } = this.creator
                const socket_id = this.socket_finder(creator_id)
                client.to(socket_id).emit("new_message", { new_message })
            }
            case ("end_game"): {
                if (this.end_game) return client.emit("error", { msg: "بازی قبلا به اتمام رسیده" })
                const { winner_side } = data
                const { lobby_id, socket } = this
                socket.to(lobby_id).emit("end_game", { winner_side })
                this.end_game = true
                setTimeout(() => {
                    this.remove_game(client)
                }, 60000)
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


    remove_game(client) {
        const { lobby_id } = this
        lobby.remove_lobby({ lobby_id, client, socket: this.socket })
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
                    this.player_status[player_status_index].alive = true
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