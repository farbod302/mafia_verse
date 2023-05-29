const Helper = require("../../helper/helper")
const TempDb = require("../../helper/temp_db")
const dinamic_vars = require("./dinamic_vars")
const befor_start = require("./funcs/before_start")
const night = require("./funcs/night")
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

    pick_game_vars() { return this.game_vars }

    mainCycle() {
        const next_event = this.game_vars.next_event
        console.log({ next_event });
        this[next_event]()
    }

    async player_action({ op, data, client }) {
        let user_call_idenity = client.idenity
        switch (op) {
            case ("ready_to_choose"): {
                this.game_vars.edit_event("push", "join_status", user_call_idenity)
                let connected_users_length = this.game_vars.join_status.length
                if (connected_users_length == static_vars.player_count) {
                    // await befor_start.players_list_generate({ users:this.users })
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
                const { game_id, game_vars } = this
                const { users_comp_list, time } = game_vars
                this.game_vars.edit_event("push", "join_status", user_call_idenity)
                let connected_users_length = this.game_vars.join_status.length
                if (connected_users_length > static_vars.player_count) {
                    start.create_live_room({
                        game_id: this.game_id,
                        game_vars: this.game_vars,
                        socket: this.socket,
                        users: this.users
                    })
                    this.socket.to(game_id).emit("user_data", { data: users_comp_list })
                    this.socket.to(game_id).emit("game_event", { data: { game_event: time } })
                    befor_start.player_status_generate({ game_vars: this.game_vars })
                    await Helper.delay(3)
                    let status_list = game_vars.player_status
                    this.socket.to(game_id).emit("game_action", { data: status_list })
                    this.game_vars.edit_event("edit", "next_event", "start_speech")
                    this.mainCycle()

                }
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
        let user_turn = this.game_vars.users_comp_list[turn]
        const { player_name, user_id, avatar } = user_turn
        let cur_turn = turn
        this.socket.to(game_id).emit("users_turn", { data: { user_name: player_name, user_id, user_image: avatar } })
        befor_start.set_timer_to_random_pick_cart({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket,
            cycle: () => { this.mainCycle() },
            turn: cur_turn
        })
    }

    wait_to_join_second_phase() {
        befor_start.wait_to_join({
            game_vars: this.game_vars,
            abandon: () => { this.game_handlers.abandon_game(this.socket) }
        })
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
        this.mainCycle()
    }


    next_player_speech() {
        this.game_vars.edit_event("edit", "turn", "plus")
        const { queue, turn, can_take_challenge, speech_type, reval } = this.game_vars
        if (queue.length === turn ) {
            //end speech
            let next_event = !reval ? "mafia_reval" : "pre_vote"
            this.game_vars.edit_event("edit", "next_event", next_event, "next_player_speech")
            this.mainCycle()
            console.log("SPEECH END");
            return
        }
        const { game_id } = this
        //emit to player to speech
        let user = queue[turn].user_id
        console.log({queue,turn});
        user = befor_start.pick_player_from_user_id({ users: this.users, user_id: user })
        const { socket_id } = user
        this.socket.to(socket_id).emit("start_speech")
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
        start.move_speech_queue({game_vars:this.game_vars})
        let new_queue = this.game_vars.queue
        this.socket.to(game_id).emit("in_game_turn_speech", { data: { queue: new_queue, can_take_challenge } })
        //set timer
        const contnue_func=()=>{this.mainCycle()}
        let time = static_vars[speech_type]
        start.set_timer_to_contnue_speech_queue({
            func: contnue_func,
            game_vars: this.game_vars,
            time,
            socket: this.socket,
            users: this.users
        })
    }

    mafia_reval() {
        start.mafia_reval({
            game_vars: this.game_vars,
            users: this.users,
            socket: this.socket
        })
        // this.mainCycle()
    }

    pre_vote() {
        vote.start_vote({ game_vars: this.game_vars })
        const { game_id } = this
        this.socket.to(game_id).emit("game_event", { data: { game_event: "vote" } })
        this.mainCycle()
    }



    next_player_vote_time() {
        const { turn, queue, vote_type } = this.game_vars
        if (turn + 1 === queue.length) {
            let next_event = vote_type === "pre_vote" ? "arange_defence" : "count_exit_vote"
            this.game_vars.edit_event("edit", "next_event", next_event)
            this.mainCycle()
        } else {
            vote.next_player_vote_turn({
                game_vars: this.game_vars,
                socket: this, socket,
                game_id: this.game_id,
                cycle: this.mainCycle
            })
        }
    }

    arange_defence() {
        vote.arange_defence({ game_vars: this.game_vars, users: this.users })
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
    }

}

module.exports = Game








