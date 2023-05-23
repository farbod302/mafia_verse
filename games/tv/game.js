const Helper = require("../../helper/helper")
const TempDb = require("../../helper/temp_db")
const dinamic_vars = require("./dinamic_vars")
const befor_start = require("./funcs/before_start")
const start = require("./funcs/start")
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
        this[next_event]()
    }

   async player_action({ op, data, client }) {
        let user_call_idenity = client.idenity
        switch (op) {
            case ("ready_to_choose"): {
                this.game_vars.edit_event("push", "join_status", user_call_idenity)
                let connected_users_length = this.game_vars.join_status.length
                if (connected_users_length == static_vars.player_count) {
                    befor_start.players_list_generate({ game_vars: this.game_vars })
                    const game_id = this.game_id
                    this.socket.to(game_id).emit("game_started")
                    this.game_vars.edit_event("edit", "next_event", "pick_cart_phase", "user connection")
                    this.mainCycle()
                }
                break
            }

            case ("selected_character"): {
                const { selected_character } = data
                befor_start.submit_cart_pick({
                    contnue_func: this.mainCycle, game_vars: this.game_vars, cart: selected_character
                })
                break
            }

            case ("ready_to_game"): {
                const {game_id,game_vars}=this
                const {users_comp_list,time}=game_vars
                this.game_vars.edit_event("push", "join_status", user_call_idenity)
                let connected_users_length = this.game_vars.join_status.length
                if (connected_users_length == static_vars.player_count) {
                    start.create_live_room({
                        game_id: this.game_id,
                        game_vars: this.game_vars,
                        socket: this.socket
                    })
                    this.socket.to(game_id).emit("user_data",{data:users_comp_list})
                    this.socket.to(game_id).emit("game_event",{data:{game_event:time}})
                    befor_start.player_status_generate()
                    await Helper.delay(3)
                    let status_list=game_vars.player_status
                    this.socket.to(game_id).emit("game_action",{data:status_list})
                    

                }
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
        let players_compleate_list = await befor_start.players_list_generate({ game_vars: this.game_vars })
        this.game_vars.edit_event("new_value", "users_comp_list", players_compleate_list, "pick_cart_phase")
        this.game_vars.edit_event("edit", "cur_event", "pick_cart_phase")
        befor_start.pick_cart_phase({ game_vars: this.game_vars })
        this.mainCycle()
    }


    next_player_pick_cart() {
        this.game_vars.edit_event("edit", "turn", "plus", "next_player_pick_cart")
        const { turn, carts, users, queue } = this.game_vars
        const {game_id}=this
        if (turn == queue.length) {
            this.game_vars.edit_event("edit", "next_event", "wait_to_join_second_phase")
            this.mainCycle()
        }
        let encrypted_data = Helper.encrypt(carts)
        this.socket.to(game_id).emit("characters", { data: encrypted_data })
        this.socket.to(users[turn].socket_id).emit("your_turn")
        let user_turn = this.game_vars.users_comp_list[turn]
        const { player_name, user_id, avatar } = user_turn
        this.socket.to(game_id).emit("users_turn", { data: { user_name: player_name, user_id, user_image: avatar } })
        befor_start.set_timer_to_random_pick_cart({game_vars:this.game_vars})
    }

    wait_to_join_second_phase() {
        this.game_vars.edit_event("edit", "join_status", [])
        befor_start.wait_to_join({
            game_vars: this.game_vars,
            abandon: () => { this.game_handlers.abandon_game(this.socket) }
        })
    }


    start_speech({type}){
        let live
    }




}

module.exports = Game