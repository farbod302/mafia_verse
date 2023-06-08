const Voice = require("../../../helper/live_kit_handler")
const User = require("../../../db/user")
const befor_start = require("./before_start")
const run_timer = require("../../../helper/timer")
const { encrypt } = require("../../../helper/helper")
const start = {

    async create_live_room({ game_id, game_vars, socket, users }) {
        // await Voice.start_room(game_id)
        for (let user of users) {
            const { user_id, socket_id } = user
            // let token = Voice.join_room(user_id, game_id)
            socket.to(socket_id).emit("game_started", { token: "1234" })
        }
    },

    async create_room_for_mafia({ mafia, socket, room_id }) {
        await Voice.start_room(room_id)
        for (let user of mafia) {
            const { user_id, socket_id } = user
            let token = Voice.join_room(user_id, game_id)
            socket.to(socket_id).emit("mafia_speech", { token })
        }

    },


    pick_live_users({ game_vars }) {
        let { player_status } = game_vars
        let live_users = player_status.filter(user => user.user_status.is_alive)
        return live_users
    },

    generate_queue({ type, game_vars, users }) {
        let live_users = users
        if (!live_users) live_users = start.pick_live_users({ game_vars })
        let queue = live_users.map(user => {
            const { user_id, user_index } = user
            return {
                user_id, user_index, speech_status: type, pass: false, challenge_used: false
            }
        })
        return queue

    },

    edit_game_action({ index, prime_event, second_event, new_value, game_vars, edit_others }) {
        try {
            let { player_status } = game_vars
            let new_game_action = [...player_status]
            let selected_user = new_game_action[index]
            selected_user[prime_event][second_event] = new_value
            new_game_action[index] = selected_user
            if (edit_others) {
                new_game_action.forEach((user, user_index) => {
                    if (index !== user_index) new_game_action[user_index][prime_event][second_event] = !new_value
                })
            }
            game_vars.edit_event("edit", "player_status", new_game_action)
        }
        catch {
            return
        }

    },

    move_speech_queue({ game_vars }) {
        const { turn, queue } = game_vars
        let new_queue = [...queue].map((user, index) => {
            return { ...user, pass: index < turn ? true : false }
        })
        game_vars.edit_event("edit", "queue", new_queue)
    },

    set_timer_to_contnue_speech_queue({ func, game_vars, time, socket, users,player_to_set_timer }) {
        const timer_func = () => {
            const {  player_status } = game_vars
            let s_player=player_status.find(player => player.user_id === player_to_set_timer)
            
            if (s_player.user_status.is_talking) {
                console.log("Force next player");
                let user=befor_start.pick_player_from_user_id({users,user_id:s_player.user_id})
                const {socket_id}=user
                socket.to(socket_id).emit("speech_time_up")
                func()
            }
        }
        run_timer(time, timer_func)
    },

    accept_cahllenge({ game_vars, user_id, users, socket }) {
        const { queue } = game_vars
        let speeching_user_index = queue.findIndex(user => !user.pass)
        let challenge_user = befor_start.pick_player_from_user_id({ users, user_id })
        let prv_queue = [...game_vars.queue]
        let user_in_queue_index = prv_queue.findIndex(user => user.user_id === user_id)
        prv_queue[user_in_queue_index].challenge_used = true
        prv_queue.splice(speeching_user_index, 0, challenge_user)
        game_vars.edit_event("edit", "queue", prv_queue)
        socket.to(challenge_user.socket_id).emit("accept_challenge")
    },

    mafia_reval({ game_vars, users, socket }) {
        const { carts } = game_vars
        const mafai_rols = ["godfather", "nato", "hostage_taker"]
        let users_pick_mafia = carts.filter(user => mafai_rols.includes(user.name))
        let users_pick_mafia_ids = users_pick_mafia.map(user => user.user_id)
        let mafia = users.filter(user => users_pick_mafia_ids.includes(user.user_id))
        let clean_mafia_detile = mafia.map(user => {
            let selected_cart = carts.find(cart => cart.user_id === user.user_id)
            return {
                index: user.id,
                role: selected_cart.name,
                user_id: user.user_id
            }
        })
        game_vars.edit_event("new_value", "mafia_list", clean_mafia_detile)
        mafia.forEach(user => {
            socket.to(user.socket_id).emit("mafia_visitation", { data: { mafia: encrypt(JSON.stringify(clean_mafia_detile)) } })
        })
        game_vars.edit_event("new_value", "mafia_list", mafia)
        game_vars.edit_event("edit", "speech_type", "turn")
        game_vars.edit_event("edit", "reval", true)
        game_vars.edit_event("edit", "next_event", "start_speech")
        game_vars.edit_event("edit", "can_take_challenge", true)
    },


    generate_report({ game_vars, report_type, socket, game_id }) {

        let raw_reports = {
            day_report: {},
            vote_report: {},
            night_report: {},
            game_result_report: {}
        }

        const { report_data } = game_vars
        const { user_id, event, msg } = report_data
        raw_reports[report_type] = {
            msg,
            event,
            user_data: {
                user_id
            }
        }

        socket.to(game_id).emit("report", { data: raw_reports })
        game_vars.edit_event("edit", "report_data", {})
    }


}


module.exports = start