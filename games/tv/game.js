const { uid } = require("uid")
const Helper = require("../../helper/helper")
const TempDb = require("../../helper/temp_db")
const run_timer = require("../../helper/timer")
const dinamic_vars = require("./dinamic_vars")
const befor_start = require("./funcs/before_start")
const night = require("./funcs/night")
const reconnect = require("./funcs/reconnect")
const start = require("./funcs/start")
const targetCover = require("./funcs/target_cover")
const vote = require("./funcs/vote")
const static_vars = require("./static_vars")
const game_result = require("./funcs/game_result")
const online_users_handler = require("../../socket/online_users_handler")
const User = require("../../db/user")
const data_handler = require("../../games_temp_data/data_handler")
const GameHistory = require("../../db/game_history")
const Game = class {
    constructor({ game_id, users, socket, game_handlers, mod }) {
        this.socket = socket
        this.mod = mod || null
        this.game_id = game_id
        this.users = users
        this.db = new TempDb()
        this.game_vars = new dinamic_vars()
        this.game_handlers = game_handlers
        this.mainCycle()
        this.socket_finder = online_users_handler.get_user_socket_id
    }


    mainCycle() {
        try {
            const next_event = this.game_vars.next_event
            this.game_vars.edit_event("edit", "cur_event", next_event)
            this[next_event]()
        } catch (err) {
            console.log(err);
            this.game_handlers.abandon()
        }
    }

    submit_user_disconnect({ client }) {
        const { user_id } = client.idenity
        let index = this.users.findIndex(user => user.user_id === user_id)
        if (index > -1 && this.game_vars.player_status) {
            start.edit_game_action({
                index,
                prime_event: "user_status",
                second_event: "is_connected",
                new_value: false,
                game_vars: this.game_vars
            })
            const { game_id } = this
            let { player_status } = this.game_vars
            this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })

        }
        if (this.mod && this.mod === user_id) return true
        return false

    }

    get_users() {
        return this.users
    }

    re_connect({ client }) {
        const { is_live } = this.game_vars
        const { game_id } = this
        const { user_id } = client
        if (this.mod && this.mod === user_id) {
            return this.re_connect_mod({ client })
        }
        if (!is_live) {
            this.game_vars.edit_event("push", "reconnect_queue", { client, is_mod: false })
        } else {
            const data = reconnect({
                game_vars: this.game_vars,
                client,
                game_id: this.game_id
            })
            let user_socket = this.socket_finder(client.user_id)
            this.socket.to(user_socket).emit("reconnect_data", { data })
            let index = this.users.findIndex(e => e.user_id == client.user_id)
            start.edit_game_action({
                index,
                prime_event: "user_status",
                second_event: "is_connected",
                new_value: true,
                edit_others: false,
                game_vars: this.game_vars
            })
            let prv_users = this.users
            prv_users[index].socket_id = user_socket
            this.users = prv_users
            const { player_status } = this.game_vars
            this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })
            this.game_vars.edit_event("pull", "abandon_queue", client.user_id)
        }
    }

    re_connect_mod({ client }) {
        const { is_live, carts } = this.game_vars
        if (!is_live) {
            this.game_vars.edit_event("push", "reconnect_queue", { client, is_mod: true })
        } else {
            const data = reconnect({
                game_vars: this.game_vars,
                client,
                game_id: this.game_id
            })
            let roles = carts.map(e => {
                return {
                    user_id: e.user_id,
                    character: Helper.character_translator(e.name)
                }
            })
            let user_socket = this.socket_finder(client.user_id)
            this.socket.to(user_socket).emit("reconnect_data", { data: { ...data, roles, join_type: "moderator" } })
        }
    }

    player_abandon({ client }) {
        const { is_live } = this.game_vars
        const { game_id } = this
        if (!is_live) {
            this.game_event.edit_event("push", "abandon_queue", client)
        } else {
            let index = this.users.findIndex(e => e.user_id == client.user_id)
            if (index === -1) return
            start.edit_game_action({
                index,
                prime_event: "user_status",
                second_event: "is_alive",
                new_value: false,
                game_vars: this.game_vars
            })
            let status_list = this.game_vars.player_status
            this.socket.to(game_id).emit("game_action", { data: [status_list[index]] })
            this.game_vars.edit_event("push", "dead_list", client.user_id)
            this.socket.to(game_id).emit("report", { data: { msg: `بازیکن ${client.user_id} به دست خدا کشته شد` } })
            this.game_handlers.submit_player_abandon({ user_id: client.user_id })
            // const new_users = this.users.filter(e => e.user_id !== client.user_id)
            const new_users = [...this.users]
            new_users[index].is_alive = "dead"
            this.users = new_users
        }

    }

    check_for_abandon() {
        const { is_live, abandon_queue } = this.game_vars
        if (!is_live) return
        for (let user of abandon_queue) {
            this.player_abandon({ client: user })
        }

    }



    async player_action({ op, data, client }) {
        let user_call_idenity = client.idenity
        switch (op) {
            case ("ready_to_choose"): {
                this.game_vars.edit_event("push", "join_status", user_call_idenity)
                let connected_users_length = this.game_vars.join_status.length
                if (connected_users_length == static_vars.player_count) {
                    const game_id = this.game_id
                    this.socket.to(game_id).emit("game_started")
                    this.game_vars.edit_event("edit", "next_event", "pick_cart_phase", "user connection")
                    this.game_vars.edit_event("edit", "start", true, "user connection")
                    this.mainCycle()
                }
            }
                break

            case ("selected_character"): {
                const { turn } = this.game_vars
                const { index } = data
                let contnue_func = () => { this.mainCycle() }
                befor_start.submit_cart_pick({
                    contnue_func, game_vars: this.game_vars, cart: index, users: this.users, turn
                })
            }
                break

            case ("ready_to_game"): {
                this.game_vars.edit_event("push", "join_status_second_phase", user_call_idenity)
                let connected_users_length = this.game_vars.join_status_second_phase.length
                if (connected_users_length === static_vars.player_count + (this.mod ? 1 : 0)) {
                    this.go_live()
                    this.game_vars.edit_event("edit", "game_go_live", true)
                }

                break
            }
            case ("reconnect"): {
                this.re_connect({ client: client.idenity })
                break
            }
            case ("next_speech"): {
                this.mainCycle()
                break
            }
            case ("vote"): {
                let index = this.users.findIndex(user => user.user_id === client.idenity.user_id)
                const { cur_event } = this.game_vars
                let event_to_change = cur_event === "target_cover" ? "target_cover_hand_rise" : "hand_rise"
                const { game_id } = this
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: event_to_change,
                    new_value: true,
                    game_vars: this.game_vars
                })
                const { player_status } = this.game_vars
                this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: event_to_change,
                    new_value: false,
                    game_vars: this.game_vars
                })

                vote.submit_vote({
                    client,
                    socket: this.socket,
                    game_id: this.game_id,
                    game_vars: this.game_vars
                })
                break
            }
            case ("user_action"): {

                const { action } = data
                const { user_id } = client.idenity
                const { game_id } = this
                let index = this.users.findIndex(user => user.user_id === user_id)
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: action,
                    new_value: true,
                    game_vars: this.game_vars,
                })
                const { player_status } = this.game_vars
                this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })

                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: action,
                    new_value: false,
                    game_vars: this.game_vars,
                })
                break
            }
            case ("accept_challenge"): {
                const { user_id } = data
                const { game_id } = this
                let index = this.users.findIndex(user => user.user_id === user_id)
                start.accept_cahllenge({
                    game_vars: this.game_vars,
                    user_id,
                    users: this.users,
                    socket: this.socket
                })
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: "accepted_challenge_request",
                    new_value: true,
                    game_vars: this.game_vars,
                })
                const { player_status } = this.game_vars
                this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })

                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: "accepted_challenge_request",
                    new_value: false,
                    game_vars: this.game_vars,
                })

                break
            }
            case ("night_act"): {
                const { role, users } = data
                const { day } = this.game_vars
                let cur_night_events = this.db.getOne("night_records", "night", day)
                let prv_events = [...cur_night_events.events]
                users.forEach(target => {
                    prv_events.push({
                        act: role,
                        target: target.user_id,
                        info: target.act
                    })
                })
                cur_night_events.events = prv_events
                this.db.replaceOne("night_records", "night", day, cur_night_events)
                night.night_act_handler({
                    user_id: client.idenity.user_id,
                    game_vars: this.game_vars,
                    act: role,
                    socket: this.socket,
                    idenity: client.idenity,
                    users: this.users,
                    targets: users
                })

                //first msg
                night.emit_to_mod({
                    game_vars: this.game_vars,
                    socket_finder: this.socket_finder,
                    mod: this.mod,
                    event: null,
                    msg: `اکت ${Helper.character_translator(role)}`,
                    socket: this.socket
                })
                await Helper.delay(2)
                //second msg
                night.emit_to_mod({
                    game_vars: this.game_vars,
                    socket_finder: this.socket_finder,
                    mod: this.mod,
                    event: {
                        from: client.idenity.user_id,
                        to: users
                    },
                    msg: null,
                    socket: this.socket
                })
                break
            }
            case ("mafia_decision"): {
                const { shot } = data
                let decision = shot ? "mafia_shot" : "use_nato"
                this.game_vars.edit_event("edit", "next_event", decision)
                if(decision === "use_nato"){
                    this.game_vars.edit_event("edit","mafia_decision",true)
                }
                night.emit_to_mod({
                    game_vars: this.game_vars,
                    socket_finder: this.socket_finder,
                    mod: this.mod,
                    event: null,
                    msg: `مافیا تصمیم به ${decision === "mafia_shot" ? "شلیک" : "ناتویی"}گرفت`,
                    socket: this.socket
                })

                this.mainCycle()
                break
            }
            case ("mafia_shot"): {
                const { users } = data
                const { day } = this.game_vars
                let cur_night_events = this.db.getOne("night_records", "night", day)
                let prv_events = [...cur_night_events.events]
                users.forEach(target => {
                    prv_events.push({
                        act: "mafia_shot",
                        target: target.user_id,
                    })
                })
                cur_night_events.events = prv_events
                this.db.replaceOne("night_records", "night", day, cur_night_events)

                night.emit_to_mod({
                    game_vars: this.game_vars,
                    socket_finder: this.socket_finder,
                    mod: this.mod,
                    event: null,
                    msg: `شات مافیا`,
                    socket: this.socket
                })
                await Helper.delay(2)

                night.emit_to_mod({
                    game_vars: this.game_vars,
                    socket_finder: this.socket_finder,
                    mod: this.mod,
                    event: {
                        from: client.idenity.user_id,
                        to: users
                    },
                    msg: null,
                    socket: this.socket
                })


                break
            }
            case ("using_speech_options"): {
                const { using_option } = data
                const { game_id } = this
                const { target_cover_queue } = this.game_vars
                let turn = target_cover_queue.findIndex(q => !q.comp)
                let new_target_cover_queue = [...target_cover_queue]
                new_target_cover_queue[turn].permission = using_option
                this.game_vars.edit_event("edit", "target_cover_queue", new_target_cover_queue)
                if (using_option) {
                    this.socket.to(game_id).emit("user_request_speech_options", { data: { requester_id: client.idenity.user_id, timer: 5 } })
                }
                this.mainCycle()
                break
            }
            case ("volunteer"): {
                const { user_id } = data
                const { target_cover_queue } = this.game_vars
                let turn = target_cover_queue.findIndex(q => !q.comp)
                let new_target_cover_queue = [...target_cover_queue]
                new_target_cover_queue[turn].users_select.push(user_id)
                if (new_target_cover_queue[turn].users_select.length === new_target_cover_queue[turn].users_select_length) {
                    new_target_cover_queue[turn].comp = true
                }
                this.game_vars.edit_event("edit", "target_cover_queue", new_target_cover_queue)
                let index = this.users.findIndex(e => e.user_id === user_id)
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: "target_cover_accepted",
                    new_value: true,
                    edit_others: false,
                    game_vars: this.game_vars
                })
                const { game_id } = this
                let status_list = this.game_vars.player_status
                this.socket.to(game_id).emit("game_action", { data: [status_list[index]] })
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: "target_cover_accepted",
                    new_value: false,
                    edit_others: false,
                    game_vars: this.game_vars

                })
                this.mainCycle()
                break
            }
            case ("rifle_gun_shot"): {
                const { user_id } = data
                start.use_gun({
                    game_vars: this.game_vars,
                    user_shot: client.idenity.user_id,
                    user_resive_shot: user_id,
                    game_id: this.game_id,
                    users: this.game_vars.users_comp_list,
                    socket: this.socket
                })
                break
            }
            case ("day_using_gun"): {
                const { user_id } = data
                this.users.forEach(user => {
                    const { user_id: uid } = user
                    let socket_id = this.socket_finder(uid)
                    if (user.user_id !== user_id) this.socket.to(socket_id).emit("day_using_gun", { data: { user_id } })

                })
                break
            }
            case ("chaos_vote"): {
                const is_last = this.game_vars.is_last_decision
                if (is_last) {
                    const { user_id } = data
                    const mafia_roles = ["godfather", "nato", "hostage_taker"]
                    const { user_id: player_selected } = client.idenity
                    const { carts } = this.game_vars
                    let winner = null
                    let player_selected_role = carts.find(e => e.user_id == player_selected)
                    let player_chosen_role = carts.find(e => e.user_id == user_id)
                    if (mafia_roles.includes(player_chosen_role.name)) {
                        winner = "mafia"
                    } else {
                        winner = "citizen"
                    }
                    if (mafia_roles.includes(player_selected_role.name)) winner = "mafia"
                    this.game_vars.edit_event("new_value", "winner", winner)
                    this.game_vars.edit_event("edit", "next_event", "end_game")
                    this.mainCycle()
                    break
                } else {

                    const { user_id } = data
                    this.game_vars.edit_event("push", "chaos_vots", user_id)
                    const { user_id: user_voted } = client.idenity
                    const { game_id } = this
                    this.socket.to(game_id).emit("chaos_vote_result", { data: { from_user: user_voted, to_user: user_id } })
                    this.mainCycle()
                    break
                }
            }
            case ("chaos_user_speech"): {
                const { user_id, talking } = data
                const { game_id } = this
                const { chaos_speech_all_status } = this.game_vars
                let new_speech_status = [...chaos_speech_all_status]
                let user_index = new_speech_status.findIndex(e => e.user_id === user_id)
                new_speech_status[user_index].talking = talking
                this.game_vars.edit_event("edit", "chaos_speech_all_status", new_speech_status)
                this.socket.to(game_id).emit("chaos_user_speech", {
                    data: new_speech_status
                })
                break
            }
            case ("last_decision"): {
                const { user_id } = data
                const mafia_roles = ["godfather", "nato", "hostage_taker"]
                const { user_id: player_selected } = client.idenity
                const { carts } = this.game_vars
                let winner = null
                let player_selected_role = carts.find(e => e.user_id == player_selected)
                let player_chosen_role = carts.find(e => e.user_id == user_id)
                if (mafia_roles.includes(player_chosen_role.name)) {
                    winner = "mafia"
                } else {
                    winner = "citizen"
                }
                if (mafia_roles.includes(player_selected_role.name)) winner = "mafia"
                this.game_vars.edit_event("new_value", "winner", winner)
                this.game_vars.edit_event("edit", "next_event", "end_game")
                this.mainCycle()
                break
            }
            case ("end_game_free_speech"): {
                const { user_id, is_talking } = data
                const { game_id } = this
                let prv_speech_status = [...this.game_vars.end_game_speech]
                let index = prv_speech_status.findIndex(e => e.user_id === user_id)
                prv_speech_status[index].is_talking = is_talking
                this.game_vars.edit_event("edit", "end_game_speech", prv_speech_status)
                this.socket.to(game_id).emit("end_game_free_speech", { data: prv_speech_status })
                break
            }
            case ("mod_speaking"): {
                const { speaking } = data
                const { game_id } = this


                this.socket.to(game_id).emit("mod_status", {
                    data: {
                        connected: this.game_vars.mod_status.connected,
                        speaking
                    }
                })
                break
            }

            case ("mod_kick"): {
                const { user_id } = data
                const { turn } = this.game_vars
                let index = this.users.findIndex(user => user.user_id === user_id)
                start.edit_game_action({
                    index,
                    prime_event: "user_status",
                    second_event: "is_alive",
                    new_value: false,
                    game_vars: this.game_vars
                })
                const { game_id } = this
                let status_list = this.game_vars.player_status
                this.socket.to(game_id).emit("game_action", { data: [status_list[index]] })
                let new_queue = [...this.game_vars.queue]
                if (new_queue[turn].user_id === user_id) {
                    this.mainCycle()
                }
                else {
                    new_queue = new_queue.filter(e => e.user_id !== user_id)
                    this.game_vars.edit_event("edit", "queue", new_queue)
                }
                break
            }
        }
    }



    wait_to_join() {
        befor_start.wait_to_join({
            game_vars: this.game_vars,
            abandon: () => { this.game_handlers.abandon_game(this.socket) }
        })
    }
    async pick_cart_phase() {
        let players_compleate_list = await befor_start.players_list_generate({ users: this.users })
        this.game_vars.edit_event("new_value", "users_comp_list", players_compleate_list, "pick_cart_phase")
        this.game_vars.edit_event("edit", "cur_event", "pick_cart_phase")
        befor_start.pick_cart_phase({ game_vars: this.game_vars, users: this.users })
        this.mainCycle()
    }

    async go_live() {
        let user_data = await befor_start.players_list_generate({ users: this.users })
        let prv_users = this.users.map(e => {
            return {
                ...e,
                socket_id: this.socket_finder(e.user_id)
            }
        })
        this.users = prv_users
        const { game_id, game_vars, mod } = this
        let mod_data
        if (mod) {
            mod_data = await befor_start.players_list_generate({ users: [{ user_id: mod }] })
            this.game_vars.edit_event("new_value", "mod_status", { connected: true, speaking: false })
        }
        const { time, carts } = game_vars
        start.create_live_room({
            game_id: this.game_id,
            game_vars: this.game_vars,
            socket: this.socket,
            users: this.users,
            mod_user_id: this.mod,
            mod_socket: this.socket_finder(mod)
        })
        this.game_vars.edit_event("edit", "players_compleate_list", user_data)

        this.game_vars.edit_event("edit", "is_live", true)
        //handel_reconnect queue
        await Helper.delay(2)
        this.socket.to(game_id).emit("users_data", { data: user_data })
        await Helper.delay(2)
        this.socket.to(game_id).emit("mod_data", mod ? { data: mod_data[0] } : { data: null })
        await Helper.delay(2)


        if (mod) {
            let mod_socket = this.socket_finder(mod)
            let roles = carts.map(e => {
                return {
                    user_id: e.user_id,
                    character: Helper.character_translator(e.name)
                }
            })
            this.socket.to(mod_socket).emit("mod_characters", { data: roles })
        }
        this.socket.to(game_id).emit("game_event", { data: { game_event: time } })
        befor_start.player_status_generate({ game_vars: this.game_vars })
        await Helper.delay(3)
        let status_list = game_vars.player_status
        this.socket.to(game_id).emit("game_action", { data: status_list })
        this.socket.to(game_id).emit("report", { data: { msg: "روز معارفه", timer: 3 } })
        await Helper.delay(3)
        this.game_vars.edit_event("edit", "next_event", "start_speech")
        const { reconnect_queue } = this.game_vars
        reconnect_queue.forEach(e => {
            if (e.is_mod) {
                return this.re_connect_mod({ client: e.client })
            } else {
                return this.re_connect({ client: e.client })
            }
        })
        this.mainCycle()
    }


    next_player_pick_cart() {
        this.game_vars.edit_event("edit", "turn", "plus", "next_player_pick_cart")
        const { turn, carts, queue } = this.game_vars
        const { game_id, users } = this
        if (turn == queue.length) {
            this.game_vars.edit_event("edit", "next_event", "wait_to_join_second_phase")
            this.mainCycle()
            return
        }
        let encrypted_data = Helper.encrypt(JSON.stringify(carts))
        this.socket.to(game_id).emit("characters", { data: encrypted_data, scenario: static_vars.scenario })
        let socket_id = this.socket_finder(users[turn].user_id)
        this.socket.to(socket_id).emit("your_turn")
        let cur_turn = turn
        let players_comp_list = this.game_vars.users_comp_list
        let clean_users = players_comp_list.map(user => {
            const { user_id, user_name, user_image } = user
            return {
                user_name, user_id, user_image
            }
        })
        clean_users = clean_users.slice(turn)
        this.socket.to(game_id).emit("users_turn", { data: clean_users })
        befor_start.set_timer_to_random_pick_cart({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket,
            cycle: () => { this.mainCycle() },
            turn: cur_turn,
            socket_finder: this.socket_finder
        })
    }

    wait_to_join_second_phase() {
        const func = () => {
            const { game_go_live } = this.game_vars
            if (!game_go_live) {
                this.go_live()
                //todo :emit dc users
            }
        }
        run_timer(20, func)
    }


    start_speech() {
        let { speech_type, can_take_challenge, custom_queue } = this.game_vars
        const { game_id } = this
        let queue = start.generate_queue({
            type: speech_type,
            game_vars: this.game_vars,
            users: custom_queue.length ? custom_queue : null
        })
        let timer = static_vars.speech_time[speech_type]
        this.game_vars.edit_event("edit", "turn", -1)
        this.game_vars.edit_event("edit", "queue", queue)
        this.game_vars.edit_event("edit", "next_event", "next_player_speech")
        this.socket.to(game_id).emit("in_game_turn_speech", { data: { queue, can_take_challenge, timer } })
        this.mainCycle()
    }


    next_player_speech() {
        this.game_vars.edit_event("edit", "turn", "plus")
        const { game_id } = this
        const { queue, turn, can_take_challenge, speech_type, reval, player_reval, carts, player_status, second_chance } = this.game_vars
        //check player reval
        if (player_reval && player_reval.turn === turn) {
            const { user_id } = player_reval
            let player_roule = carts.find(c => c.user_id === user_id)
            const { name, id } = player_roule
            this.socket.to(game_id).emit("player_show_character", { data: { user_id, id, name } })
            this.game_vars.edit_event("edit", "player_reval", null)
            const contnue_func = () => {
                start.edit_game_action({
                    index: queue[turn].user_index,
                    prime_event: "user_status",
                    second_event: "is_alive",
                    new_value: false,
                    game_vars: this.game_vars
                })
                const { player_status } = this.game_vars
                this.socket.to(game_id).emit("game_action", { data: [player_status[queue[turn].user_index]] })
                this.game_vars.edit_event("edit", "turn", turn - 1)

                this.mainCycle()
            }
            run_timer(5, contnue_func)
            return
        }

        if (queue.length === turn) {
            this.game_vars.edit_event("edit","second_chance",[])
            const index = this.users.findIndex(e => e.user_id === queue[turn - 1].user_id)
            start.edit_game_action({
                index,
                prime_event: "user_status",
                second_event: "is_talking",
                new_value: false,
                game_vars: this.game_vars,
                edit_others: false
            })
            this.game_vars.edit_event("edit", "speech_code", "")
            const { player_status } = this.game_vars
            this.socket.to(game_id).emit("game_action", { data: [player_status[index]] })
            this.socket.to(game_id).emit("current_speech_end")
            if (speech_type === "chaos") {
                this.game_vars.edit_event("edit", "next_event", "chaos_speech_second_phase")
                this.mainCycle()
                return
            }
            //end speech
            if (speech_type === "final_words") {
                let game_result_check = night.check_next_day({ game_vars: this.game_vars })
                if (game_result_check === 4 || game_result_check === 3) {

                    this.game_vars.edit_event("edit", "next_event", "start_night")
                    this.game_vars.edit_event("edit", "vote_type", "pre_vote")
                    this.mainCycle()
                    return
                }
                else {
                    let winner = game_result_check === 2 ? "mafia" : "citizen"
                    this.game_vars.edit_event("edit", "winner", winner)
                    this.game_vars.edit_event("edit", "next_event", "end_game")
                    this.mainCycle()
                    return


                }

            }
            else {
                let next_event = !reval ? "mafia_reval" : "pre_vote"
                this.game_vars.edit_event("edit", "next_event", next_event, "next_player_speech")
                this.game_vars.edit_event("edit", "speech_type", "turn", "next_player_speech")
                this.mainCycle()
                return
            }
        }
        // emit current_speech
        this.socket.to(game_id).emit("current_speech_end")
        let cur_speech = queue[turn]
        const cur_user_status = player_status.find(e => e.user_id === cur_speech.user_id)
        if (!cur_user_status.user_status.is_connected) {
            if (!second_chance.includes(cur_speech.user_id)) {
                const new_queue = [...queue]
                new_queue.push(cur_speech)
                this.game_vars.edit_event("edit", "queue", new_queue)
                this.game_vars.second_chance.push(cur_speech.user_id)
            }
            this.mainCycle()
            return
        }
        let time = static_vars.speech_time[speech_type]
        this.socket.to(game_id).emit("current_speech", {
            current: cur_speech.user_id,
            timer: time,
            has_next: turn === queue.length - 1 ? false : true
        })


        //emit to player to speech
        let user = queue[turn].user_id
        const user_speech_type = queue[turn].speech_status
        //emit challenge status
        if (user_speech_type !== "turn" || !can_take_challenge) {
            let status_list = this.users.map(user => {
                return {
                    user_id: user.user_id,
                    status: false
                }
            })
            this.socket.to(game_id).emit("users_challenge_status", { data: status_list })
        }
        else {

            let status_list = this.users.map(user => {
                const { user_id } = user
                let user_in_queue = queue.filter(u => u.user_id === user_id)
                return {
                    user_id,
                    status: user_in_queue.length === 1
                }
            })
            this.socket.to(game_id).emit("users_challenge_status", { data: status_list })


        }
        user = befor_start.pick_player_from_user_id({ users: this.users, user_id: user })
        let other_users = befor_start.pick_other_player_from_user_id({ users: this.users, user_id: user.user_id })
        const { user_id } = user
        let socket_id = this.socket_finder(user_id)
        this.socket.to(socket_id).emit("start_speech")
        other_users.forEach(u => {
            const s_user_socket = this.socket_finder(u.user_id)
            this.socket.to(s_user_socket).emit("game_event", { data: { game_event: "action" } })
        })
        // edit game action
        const index = this.users.findIndex(e => e.user_id === user_id)
        start.edit_game_action({
            index,
            prime_event: "user_status",
            second_event: "is_talking",
            new_value: true,
            game_vars: this.game_vars,
            edit_others: true
        })
        let status_list = this.game_vars.player_status
        this.socket.to(game_id).emit("game_action", { data: [status_list[index]] })
        //edit speech queue
        start.move_speech_queue({ game_vars: this.game_vars })
        let new_queue = this.game_vars.queue
        this.socket.to(game_id).emit("in_game_turn_speech", { data: { queue: new_queue, can_take_challenge, timer: time } })
        //set timer
        const contnue_func = () => { this.mainCycle(); }
        let speech_code = uid(4)
        this.game_vars.edit_event("edit", "speech_code", speech_code)
        start.set_timer_to_contnue_speech_queue({
            func: contnue_func,
            game_vars: this.game_vars,
            time,
            users: this.users,
            socket: this.socket,
            speech_code,
            player_to_set_timer: user.user_id
        })
    }

    async mafia_reval() {
        start.mafia_reval({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket,
            game_id: this.game_id
        })
        const { game_id } = this
        this.socket.to(game_id).emit("report", { data: { msg: "مافیا در حال شناخت هم تییمی های خود هستند", timer: 3 } })
        await Helper.delay(8)
        this.mainCycle()
    }

    async pre_vote() {
        const { gun_status } = this.game_vars
        gun_status.forEach(gun => {
            const user_to_emit = befor_start.pick_player_from_user_id({ users: this.users, user_id: gun.user_id })
            let socket_id = this.socket_finder(user_to_emit.user_id)
            this.socket.to(socket_id).emit("gun_status", { data: { gun_enable: false } })
        })

        await vote.start_vote({ game_vars: this.game_vars })
        const { game_id } = this
        this.socket.to(game_id).emit("game_event", { data: { game_event: "vote" } })
        await Helper.delay(2)
        this.mainCycle()
    }


    async check_for_inquiry() {
        this.game_vars.edit_event("edit", "custom_queue", ["inquiry"])
        this.game_vars.edit_event("edit", "turn", -1)
        this.game_vars.edit_event("edit", "vote_type", "inquiry")
        const { game_id } = this
        this.socket.to(game_id).emit("day_inquiry", { data: { timer: 5 } })
        this.socket.to(game_id).emit("game_event", { data: { game_event: "inquiry_vote" } })
        await vote.start_vote({ game_vars: this.game_vars })
        this.mainCycle()

    }



    next_player_vote_time() {
        this.game_vars.edit_event("edit", "turn", "plus")
        const { turn, queue, vote_type } = this.game_vars
        if (turn == queue.length) {
            if (vote_type === "inquiry") {
                let live_users = start.pick_live_users({ game_vars: this.game_vars })
                const { votes_status } = this.game_vars
                let users_voted = votes_status[0].users.length
                if (users_voted > (live_users.length / 2)) {
                    this.game_vars.edit_event("edit", "next_event", "inquiry")
                }
                else {
                    this.game_vars.edit_event("edit", "custom_queue", [])
                    this.game_vars.edit_event("edit", "next_event", "start_speech")
                }
                this.game_vars.edit_event("edit", "vote_type", "pre_vote")
                this.mainCycle()
                return

            } else {
                let next_event = vote_type === "pre_vote" ? "arange_defence" : "count_exit_vote"
                this.game_vars.edit_event("edit", "next_event", next_event)
                this.mainCycle()
                return
            }
        } else {
            let cycle = () => { this.mainCycle() }
            vote.next_player_vote_turn({
                game_vars: this.game_vars,
                socket: this.socket,
                game_id: this.game_id,
                users: this.users,
                cycle,
            })
        }
    }

    arange_defence() {
        vote.arange_defence({ game_vars: this.game_vars, users: this.users })
        this.mainCycle()
    }

    enable_target_cover() {
        targetCover.enable_target_cover({ game_vars: this.game_vars, user: this.users })
        this.game_vars.edit_event("edit", "next_event", "next_player_target_cover")
        this.game_vars.edit_event("edit", "cur_event", "target_cover")
        this.mainCycle()
    }

    next_player_target_cover() {
        const { game_id } = this
        const { target_cover_queue } = this.game_vars
        let turn = target_cover_queue.findIndex(q => !q.comp)
        if (turn === -1) {
            //end target cover
            vote.arrange_queue_after_target_cover({ game_vars: this.game_vars, users: this.users })
            this.game_vars.edit_event("edit", "cur_event", "speech")
            this.mainCycle()
            return
        }
        const { user_id } = target_cover_queue[turn]
        let user = befor_start.pick_player_from_user_id({ users: this.users, user_id })
        let socket_id = this.socket_finder(user.user_id)
        if (target_cover_queue[turn].permission === null) {
            this.socket.to(socket_id).emit("using_speech_options", {
                data:
                    { msg: `آیا درخواست ${target_cover_queue.length === 1 ? "تارگت کاور" : "درباره"} دارید؟`, timer: 7 }
            })
            //set timer to move


            const continue_func = (target_cover_queue, turn) => {
                if (target_cover_queue[turn].permission === null) {
                    let new_target_cover = [...target_cover_queue]
                    new_target_cover[turn].comp = true
                    this.game_vars.edit_event("edit", "target_cover_queue", new_target_cover)
                    this.mainCycle()
                }
            }
            run_timer(8, () => { continue_func(target_cover_queue, turn) })
            return
        }
        if (target_cover_queue[turn].permission === false) {
            let new_target_cover_queue = [...target_cover_queue]
            new_target_cover_queue[turn].comp = true
            this.mainCycle()
            return
        }
        if (target_cover_queue[turn].permission === true) {
            let selected = { ...target_cover_queue[turn] }
            let choose_type = null
            if (selected.users_select_length === 1) choose_type = "about"
            if (selected.users_select_length === 2 && selected.users_select.length === 0) choose_type = "target"
            if (selected.users_select_length === 2 && selected.users_select.length === 1) choose_type = "cover"
            const translate = () => {
                switch (choose_type) {
                    case ("target"): return "تارگت"
                    case ("cover"): return "کاور"
                    case ("about"): return "درباره"
                }
            }

            this.socket.to(socket_id).emit("speech_option_msg",
                {
                    data: {
                        msg: `از بین بازیکنان یک نفر را برای ${translate()} انتخاب کنید`, timer: 10
                    }
                })

            this.socket.to(socket_id).emit("grant_permission", { data: { grant: true } })

            this.socket.to(game_id).emit("request_speech_options", {
                data: {
                    requester_id: user.user_id,
                    option: choose_type,
                    timer: 7
                }
            })

            const timer_func = ({ cur_selected, turn }) => {

                let target_cover_queue = this.game_vars.target_cover_queue[turn]
                const { comp, users_select } = target_cover_queue
                if (!comp && users_select.length == +cur_selected) {
                    let q = [...this.game_vars.target_cover_queue]
                    q[turn].comp = true
                    this.game_vars.edit_event("edit", "target_cover_queue", q)
                    this.mainCycle()
                }

            }
            let cur_selected = `${[...selected.users_select].length}`

            run_timer(15, () => { timer_func({ cur_selected, turn }) })

            this.socket.to(game_id).emit("game_event", { data: { game_event: "target_cover_about" } })

        }

    }


    count_exit_vote() {
        const { game_id, socket } = this
        let user_to_exit = vote.count_exit_vote({ game_vars: this.game_vars, game_id, socket, users: this.users })
        if (user_to_exit) {
            let user_to_speech = befor_start.pick_player_from_user_id({ users: this.users, user_id: user_to_exit })
            let queue = [user_to_speech]
            this.game_vars.edit_event("edit", "next_event", "start_speech")
            this.game_vars.edit_event("edit", "custom_queue", [])
            // this.game_vars.edit_event("edit", "custom_queue", queue)
            this.game_vars.edit_event("edit", "speech_type", "final_words")
            this.game_vars.edit_event("edit", "turn", -1)
            data_handler.add_data(this.game_id, { user: "server", op: "user_exit", data: { user_to_exit } })
        }
        else {
            this.game_vars.edit_event("edit", "next_event", "start_night")
        }
        this.game_vars.edit_event("edit", "defenders_queue", [])
        this.mainCycle()
    }

    async inquiry() {
        this.game_vars.edit_event("edit", "inquiry_used", "plus")
        let inquiry_res = start.inquiry({ game_vars: this.game_vars })
        const { game_id } = this
        this.socket.to(game_id).emit("day_inquiry_result", { data: { msg: inquiry_res, timer: 7 } })
        await Helper.delay(5)
        this.game_vars.edit_event("edit", "custom_queue", [])
        this.game_vars.edit_event("edit", "next_event", "start_speech")
        this.game_vars.edit_event("edit", "vote_type", "pre_vote")
        this.mainCycle()

    }



    start_night() {
        night.start_night({
            game_vars: this.game_vars,
            socket: this.socket,
            game_id: this.game_id
        })
        const { day } = this.game_vars
        this.db.add_data("night_records", { night: day, events: [] })
        this.mainCycle()
    }
    guard_and_hostage_taker_act() {
        night.guard_and_hostage_taker_act({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        let mainCycle = () => { this.mainCycle() }
        this.game_vars.edit_event("edit", "next_event", "mafia_speech")
        run_timer(25, mainCycle)
    }

    async mafia_speech() {
        const { game_id } = this
        this.socket.to(game_id).emit("report", { data: { msg: "زمان هم فکری مافیا", timer: 3 } })
        await night.mafia_speech({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        this.game_vars.edit_event("edit", "next_event", "check_mafia_decision")
        this.mainCycle()
    }

    check_mafia_decision() {
        night.check_mafia_decision({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        const timer_func = () => {
            const { next_event } = this.game_vars
            if (next_event === "check_mafia_decision") {
                this.game_vars.edit_event("edit", "next_event", "mafia_shot")
                this.mainCycle()
            }
        }

        run_timer(10, timer_func)
    }

    mafia_shot() {
        night.mafia_shot({
            game_vars: this.game_vars,
            socket: this.socket,
            socket_finder: this.socket_finder
        })
        this.game_vars.edit_event("edit", "next_event", "other_acts")
        const timer_func = () => { this.mainCycle() }
        run_timer(15, timer_func)


    }


    use_nato() {
        night.use_nato({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket,
            game_id: this.game_id
        })
        this.game_vars.edit_event("edit", "next_event", "other_acts")

        const timer_func = () => {

            this.mainCycle()

        }
        run_timer(7, timer_func)
    }


    other_acts() {
        const { day } = this.game_vars
        let records = this.db.getOne("night_records", "night", day)
        night.other_acts({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket,
            records
        })
        this.game_vars.edit_event("edit", "next_event", "night_results")
        let mainCycle = () => { this.mainCycle() }
        run_timer(10, mainCycle)
    }

    async night_results() {
        const { day } = this.game_vars
        const night_records = this.db.getOne("night_records", "night", day)
        let users_disconnected = this.game_vars.player_status.filter(e => !e.user_status.is_connected)
        let prv_abandon_queue = this.game_vars.abandon_queue
        this.game_vars.edit_event("edit", "abandon_queue", [...prv_abandon_queue, ...users_disconnected])
        this.check_for_abandon()
        await night.night_results({
            game_vars: this.game_vars,
            records: night_records.events,
            users: this.users,
            socket: this.socket,
            game_id: this.game_id
        })
        await Helper.delay(3)
        this.mainCycle()

    }


    async next_day() {
        await night.next_day({
            game_vars: this.game_vars,
            socket: this.socket,
            game_id: this.game_id
        })
        await Helper.delay(5)
        const { inquiry_used, gun_status } = this.game_vars
        if (inquiry_used < 2) this.game_vars.edit_event("edit", "next_event", "check_for_inquiry")
        else {
            this.game_vars.edit_event("edit", "custom_queue", [])
            this.game_vars.edit_event("edit", "next_event", "start_speech")
        }
        gun_status.forEach(gun => {
            const user_to_emit = befor_start.pick_player_from_user_id({ users: this.users, user_id: gun.user_id })
            let socket_id = this.socket_finder(user_to_emit.user_id)
            this.socket.to(socket_id).emit("gun_status", { data: { gun_enable: true } })
        })
        await Helper.delay(5)
        this.mainCycle()
    }


    async chaos() {
        const { game_id } = this
        const { chaos_run_count } = this.game_vars
        this.game_vars.edit_event("edit", "chaos_vots", [])
        if (chaos_run_count === 2) {
            //random user
            return
        }
        this.game_vars.edit_event("edit", "chaos_run_count", "plus")

        this.socket.to(game_id).emit("game_event", { data: { game_event: "chaos" } })
        // this.socket.to(game_id).emit("game_action", { data: user_status })
        this.socket.to(game_id).emit("report", { data: { msg: "زمان هرج و مرج زمان صحبت نوبتی", timer: 3 } })

        await Helper.delay(5)
        this.game_vars.edit_event("edit", "custom_queue", [])
        this.game_vars.edit_event("edit", "speech_type", "chaos")
        this.game_vars.edit_event("edit", "next_event", "start_speech")
        this.mainCycle()

    }


    async chaos_speech_second_phase() {
        const { game_id } = this
        this.socket.to(game_id).emit("report", { data: { msg: "صحبت دسته جمعی", timer: 3 } })
        await Helper.delay(3)
        let live_users = start.pick_live_users({ game_vars: this.game_vars })
        live_users = live_users.map(e => e.user_id)
        live_users = [...this.users].filter(e => live_users.includes(e.user_id))
        live_users.forEach(user => {
            const { user_id } = user
            let socket_id = this.socket_finder(user_id)
            this.socket.to(socket_id).emit("chaos_all_speech")
        })
        let chaos_speech_all_status = live_users.map(user => {
            return {
                user_id: user.user_id,
                talking: false
            }
        })
        this.socket.to(game_id).emit("chaos_user_speech", {
            data: chaos_speech_all_status
        })
        this.socket.to(game_id).emit("test_fake_data")
        this.game_vars.edit_event("new_value", "chaos_speech_all_status", chaos_speech_all_status)

        this.game_vars.edit_event("edit", "next_event", "chaos_result_first_phase")
        run_timer(10, () => {
            live_users.forEach(user => {
                const { user_id } = user
                let socket_id = this.socket_finder(user_id)
                this.socket.to(socket_id).emit("chaos_all_speech_end")
            })
            this.mainCycle()
        })
    }


    chaos_result_first_phase() {
        const { game_id } = this

        this.socket.to(game_id).emit("chaos_notif_vote_time")
        this.game_vars.edit_event("edit", "next_event", "next_player_chaos_vote")
        this.game_vars.edit_event("edit", "turn", -1)
        start.generate_queue({
            type: "chaos",
            game_vars: this.game_vars,
            users: this.users
        })
        this.mainCycle()
    }


    next_player_chaos_vote() {
        this.game_vars.edit_event("edit", "turn", "plus")
        const { queue, turn } = this.game_vars
        if (turn === queue.length) {
            this.game_vars.edit_event("edit", "next_event", "chaos_result_second_phase")
            this.mainCycle()
            return
            //end vote
        }
        const av_users = [...queue].filter((u, i) => i !== turn)
        const { user_id } = queue[turn]
        let player = befor_start.pick_player_from_user_id({ users: this.users, user_id })
        let socket_id = this.socket_finder(user_id)
        this.socket.to(socket_id).emit("chaos_vote", { data: { available_users: av_users.map(e => e.user_id) } })
        let restart_vote = (game_vars, require_vote, mainCycle) => {
            const { chaos_vots } = game_vars
            if (chaos_vots.length < Number(require_vote)) {
                game_vars.edit_event("edit", "next_event", "chaos")
                mainCycle()

            }
        }
        run_timer(15, () => { restart_vote(this.game_vars, `${turn + 1}`, () => { this.mainCycle() }) })

    }

    chaos_result_second_phase() {
        const { chaos_vots } = this.game_vars
        let live_users = start.pick_live_users({ game_vars: this.game_vars })
        const selected_user = live_users.find(user => {
            let times_user_selected = chaos_vots.filter(e => e === user.user_id)
            if (times_user_selected.length === 2) return true
            return false
        })
        if (!selected_user) {
            this.game_vars.edit_event("edit", "next_event", "chaos")
            this.mainCycle()
            return
        }
        else {
            this.game_vars.edit_event("new_value", "is_last_decision", true)
            const { user_id } = selected_user
            let other_players = live_users.filter(e => e.user_id !== user_id).map(u => u.user_id)
            this.game_vars.edit_event("new_value", "last_decision", null)
            let socket_id = this.socket_finder(user_id)
            this.socket.to(socket_id).emit("report", { data: { msg: "تصمیم نهایی با شماست.شهروند خود را انتخاب کنید", timer: 3 } })
            this.socket.to(socket_id).emit("last_decision", { data: { available_users: other_players } })
            const timer_func = () => {
                if (!this.game_vars.winner) {
                    this.game_vars.edit_event("new_value", "is_last_decision", false)
                    this.game_vars.edit_event("edit", "next_event", "chaos")
                    this.mainCycle()
                }
            }
            run_timer(15, () => { timer_func() })
        }

    }


    async end_game() {
        const { game_id } = this
        this.game_vars.edit_event("edit", "is_end", true)
        const { winner } = this.game_vars
        let report = await game_result.game_result_generator({
            game_vars: this.game_vars,
            users: this.game_vars.users_comp_list,
            winner
        })

        const new_game_result = {
            game_id,
            winner,
            users: this.users.map(e => e.user_id),
            game_info: report
        }

        new GameHistory(new_game_result).save()

        let database_update = report.users.map(update => {
            let key = update.winner ? "points.win" : "points.lose"
            return User.findOneAndUpdate({ uid: update.user_id }, {
                $inc: {
                    "ranking.rank": update.point,
                    "session_rank.day": update.point,
                    "session_rank.week": update.point,
                    "session_rank.session": update.point,
                    "ranking.xp": update.xp,
                    [key]: 1
                }
            })
        })
        await Promise.all(database_update)
        this.game_vars.edit_event("new_value", "end_game_speech", this.users.map(user => {
            return { user_id: user.user_id, is_talking: false }
        }))
        this.game_vars.edit_event("edit", "game_event", "end")
        this.socket.to(game_id).emit("game_event", { data: { game_event: "end" } })
        await Helper.delay(2)
        this.socket.to(game_id).emit("end_game_result", { data: report })
        this.game_handlers.submit_finish_game(game_id)
        const new_users = this.users.map(e => { return { ...e, is_alive: "dead" } })
        this.users = new_users
        //finish game
    }


}

module.exports = Game








