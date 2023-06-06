const Helper = require("../../helper/helper")
const TempDb = require("../../helper/temp_db")
const run_timer = require("../../helper/timer")
const dinamic_vars = require("./dinamic_vars")
const befor_start = require("./funcs/before_start")
const night = require("./funcs/night")
const reconnect = require("./funcs/reconnect")
const start = require("./funcs/start")
const vote = require("./funcs/vote")
const static_vars = require("./static_vars")

const Game = class {
    constructor({ game_id, users, socket, game_handlers }) {
        this.socket = socket
        this.game_id = game_id
        this.users = users
        this.db = new TempDb()
        this.game_vars = { ...dinamic_vars }
        this.game_handlers = game_handlers
        this.mainCycle()
    }


    mainCycle() {
        const next_event = this.game_vars.next_event
        console.log({ next_event });
        this[next_event]()
    }

    submit_user_disconnect({ client }) {
        console.log(`${client.idenity.user_id} Disconnectet from game`);
        const { user_id } = client.idenity
        let index = this.users.findIndex(user => user.user_id === user_id)
        start.edit_game_action({
            index,
            prime_event: "user_status",
            second_event: "is_connected",
            new_value: false,
            game_vars: this.game_vars
        })
        const { game_id } = this
        let status_list = this.game_vars.player_status
        this.socket.to(game_id).emit("game_action", { data: status_list })

    }

    re_connect({ client }) {

        const data = reconnect({
            game_vars: this.game_vars,
            users: this.users,
            client,
            game_id: this.game_id
        })
        this.socket.to(client.id).emit("game_history", { data })

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
                if (connected_users_length === static_vars.player_count) {
                    this.go_live()
                    this.game_vars.edit_event("edit","game_go_live",true)
                }

                break
            }

            case ("next_speech"): {
                this.mainCycle()
                break
            }
            case ("vote"): {
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
                this.socket.to(game_id).emit("game_action", { data: player_status })
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
                this.socket.to(game_id).emit("game_action", { data: player_status })
                start.edit_game_action({
                    index,
                    prime_event: "user_action",
                    second_event: "accepted_challenge_request",
                    new_value: false,
                    game_vars: this.game_vars,
                })

                break
            }

            case ("target_ability"): {
                const { character, targets } = data
                const { day } = this.game_vars
                let cur_night_events = this.db.getOne("night_reports", night, day)
                let prv_events = [...cur_night_events.events]
                targets.forEach(target => {
                    prv_events.push({
                        act: character,
                        target,
                    })
                })
                cur_night_events.events = prv_events
                this.db.replaceOne("night_reports", night, day, cur_night_events)
                night.night_act_handler({
                    user_id: client.idenity.user_id,
                    game_vars: this.game_vars,
                    act: character,
                    socket: this.socket,
                    idenity: client.idenity
                })
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
        const { game_id, game_vars } = this
        const { time } = game_vars
        console.log("READY TO GAME");
        start.create_live_room({
            game_id: this.game_id,
            game_vars: this.game_vars,
            socket: this.socket,
            users: this.users
        })
        this.socket.to(game_id).emit("users_data", { data: user_data })
        this.socket.to(game_id).emit("game_event", { data: { game_event: time } })
        befor_start.player_status_generate({ game_vars: this.game_vars })
        await Helper.delay(3)
        let status_list = game_vars.player_status
        this.socket.to(game_id).emit("game_action", { data: status_list })
        this.game_vars.edit_event("edit", "next_event", "start_speech")
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
        this.socket.to(users[turn].socket_id).emit("your_turn")
        let cur_turn = turn
        let players_comp_list = this.game_vars.users_comp_list
        let clean_users = players_comp_list.map(user => {
            console.log({ user });
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
            turn: cur_turn
        })
    }

    wait_to_join_second_phase() {
        const func=()=>{
            const {game_go_live}=this.game_vars
            if(!game_go_live){
                this.go_live()
                //todo :emit dc users
            }
        }
        run_timer(20,func)
    }


    start_speech() {
        let { speech_type, can_take_challenge, custom_queue } = this.game_vars
        const { game_id } = this
        let queue = start.generate_queue({
            type: speech_type,
            game_vars: this.game_vars,
            users: custom_queue.length ? custom_queue : null
        })
        this.game_vars.edit_event("edit", "turn", -1)
        this.game_vars.edit_event("edit", "queue", queue)
        this.game_vars.edit_event("edit", "next_event", "next_player_speech")
        this.socket.to(game_id).emit("in_game_turn_speech", { data: { queue, can_take_challenge } })
        console.log("START SPEECH");
        this.mainCycle()
    }


    next_player_speech() {

        this.game_vars.edit_event("edit", "turn", "plus")
        const { queue, turn, can_take_challenge, speech_type, reval } = this.game_vars
        if (queue.length === turn) {
            //end speech
            let next_event = !reval ? "mafia_reval" : "pre_vote"
            this.game_vars.edit_event("edit", "next_event", next_event, "next_player_speech")
            this.mainCycle()
            return
        }
        const { game_id } = this
        //emit to player to speech
        let user = queue[turn].user_id
        user = befor_start.pick_player_from_user_id({ users: this.users, user_id: user })
        let other_users = befor_start.pick_other_player_from_user_id({ users: this.users, user_id: user.user_id })
        const { socket_id } = user
        this.socket.to(socket_id).emit("start_speech")
        other_users.forEach(u => { this.socket.to(u.socket_id).emit("game_event", { data: { game_event: "action" } }) })
        // edit game action
        start.edit_game_action({
            index: turn,
            prime_event: "user_status",
            second_event: "is_talking",
            new_value: true,
            game_vars: this.game_vars,
            edit_others: true
        })
        let status_list = this.game_vars.player_status
        this.socket.to(game_id).emit("game_action", { data: status_list })
        //edit speech queue
        start.move_speech_queue({ game_vars: this.game_vars })
        let new_queue = this.game_vars.queue
        let time = static_vars.speech_time[speech_type]
        this.socket.to(game_id).emit("in_game_turn_speech", { data: { queue: new_queue, can_take_challenge, time } })
        //set timer
        const contnue_func = () => { this.mainCycle(); }
        console.log("TIME :", time);
        start.set_timer_to_contnue_speech_queue({
            func: contnue_func,
            game_vars: this.game_vars,
            time,
            socket: this.socket,
            users: this.users
        })
    }

    async mafia_reval() {
        start.mafia_reval({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        await Helper.delay(5)
        this.mainCycle()
    }

    pre_vote() {
        vote.start_vote({ game_vars: this.game_vars })
        const { game_id } = this
        this.socket.to(game_id).emit("game_event", { data: { game_event: "vote" } })
        this.mainCycle()
    }



    next_player_vote_time() {
        this.game_vars.edit_event("edit", "turn", "plus")
        const { turn, queue, vote_type } = this.game_vars
        if (turn === queue.length) {
            let next_event = vote_type === "pre_vote" ? "arange_defence" : "count_exit_vote"
            this.game_vars.edit_event("edit", "next_event", next_event)
            this.mainCycle()
        } else {
            let cycle = () => { this.mainCycle() }
            vote.next_player_vote_turn({
                game_vars: this.game_vars,
                socket: this.socket,
                game_id: this.game_id,
                cycle,
            })
        }
    }

    arange_defence() {
        vote.arange_defence({ game_vars: this.game_vars, users: this.users })
        this.mainCycle()
    }

    count_exit_vote() {
        const { game_id, socket } = this
        vote.count_exit_vote({ game_vars: this.game_vars, game_id, socket })
        this.mainCycle()
    }

    start_night() {
        night.start_night({
            game_vars: this.game_vars,
            socket: this.socket,
            game_id: this.game_id
        })
        const { day } = this.game_vars
        this.db.add_data("night_report", { night: day, events: [] })
        this.mainCycle()
    }
    guard_and_hostage_taker_act() {
        night.guard_and_hostage_taker_act({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        let mainCycle = () => { this.mainCycle() }
        this.game_vars.edit_event("edit", "next_event", "mafia_shot")
        run_timer(20, mainCycle)
    }

    mafia_shot() {
        night.mafia_shot({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        this.game_vars.edit_event("edit", "next_event", "other_acts")
        let mainCycle = () => { this.mainCycle() }
        run_timer(30, mainCycle)

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
        this.game_vars.edit_event("edit", "next_event", "night_result")
        let mainCycle = () => { this.mainCycle() }
        run_timer(40, mainCycle)
    }

    night_results() {
        const { day } = this.game_vars
        const night_records = this.db.getOne("night_records", "nigth", day)
        night.night_results({
            game_vars: this.game_vars,
            night_records: night_records.events,
            socket: this.socket
        })
    }

}

module.exports = Game








