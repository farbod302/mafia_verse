const Voice = require("../../../helper/live_kit_handler")
const User = require("../../../db/user")
const befor_start = require("./before_start")
const run_timer = require("../../../helper/timer")
const { encrypt } = require("../../../helper/helper")
const data_handler = require("../../../games_temp_data/data_handler")
const Helper = require("../../../helper/helper")
const start = {

    async create_live_room({ game_id, socket, users, mod_user_id, mod_socket }) {
        await Voice.start_room(game_id)
        await Helper.delay(3)
        for (let user of users) {
            const { user_id, socket_id } = user
            let token = Voice.join_room(user_id, game_id)
            socket.to(socket_id).emit("livekit_token", { token })
        }
        if (mod_user_id) {
            let mod_token = Voice.join_room(mod_user_id, game_id)
            socket.to(mod_socket).emit("livekit_token", { token: mod_token })
        }

    },

    async create_room_for_mafia({ mafia, socket, room_id }) {
        await Voice.start_room(room_id)
        for (let user of mafia) {
            const { user_id, socket_id } = user
            let token = Voice.join_room(user_id, room_id)
            const teammate = mafia.find(e => e.user_id !== user_id)
            socket.to(socket_id).emit("mafia_speech", { token, timer: 20, teammate: teammate.user_id })
            setTimeout(() => {
                socket.to(socket_id).emit("mafia_speech_end")
            }, 25000)
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

    set_timer_to_contnue_speech_queue({ func, game_vars, time, socket, users, speech_code, player_to_set_timer }) {
        const timer_func = () => {
            const { speech_code: cur_speech_code } = game_vars

            if (speech_code === cur_speech_code) {
                let user = befor_start.pick_player_from_user_id({ users, user_id: player_to_set_timer })
                const { socket_id } = user
                socket.to(socket_id).emit("speech_time_up", { data: { user_id: user.user_id } })
                func()
            }
        }
        run_timer(time, timer_func)
    },

    accept_cahllenge({ game_vars, user_id, users, socket }) {
        const { queue, turn } = game_vars
        let speeching_user_index = turn + 1
        let challenge_user = befor_start.pick_player_from_user_id({ users, user_id })
        console.log({challenge_user});
        let user_to_add_queue = {
            user_id: challenge_user.user_index,
            user_index: challenge_user.id,
            speech_status: "challenge",
            pass: false,
            challenge_used: true
        }
        let prv_queue = [...game_vars.queue]
        console.log({ queue_before_challenge: prv_queue });
        let current_user = queue[turn]
        let user_in_queue_index = prv_queue.findIndex(user => user.user_id === current_user.user_id)
        prv_queue[user_in_queue_index].challenge_used = true
        prv_queue.splice(speeching_user_index, 0, user_to_add_queue)
        game_vars.edit_event("edit", "queue", prv_queue)
        console.log({ queue_after_challenge: prv_queue });

        socket.to(challenge_user.socket_id).emit("accept_challenge")
    },

    mafia_reval({ game_vars, users, socket, game_id }) {
        socket.to(game_id).emit("action_end")
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
        data_handler.add_data(game_id, { user: "server", op: "mafia_list", data: { mafia_list: clean_mafia_detile } })
        mafia.forEach(user => {
            socket.to(user.socket_id).emit("mafia_visitation", { data: { mafia: encrypt(JSON.stringify(clean_mafia_detile)) } })
        })
        game_vars.edit_event("edit", "speech_type", "turn")
        game_vars.edit_event("edit", "reval", true)
        game_vars.edit_event("edit", "next_event", "start_speech")
        // game_vars.edit_event("edit", "next_event", "start_night")
        game_vars.edit_event("edit", "can_take_challenge", true)
    },


    generate_report({ game_vars, report_type, socket, game_id }) {
        const { report_data } = game_vars
        const { user_id, msg } = report_data
        raw_reports = {
            msg,
            report_type,
            user_id,
            timer: 7
        }
        socket.to(game_id).emit("report", { data: raw_reports })
        game_vars.edit_event("edit", "report_data", {})
    },


    inquiry({ game_vars }) {
        const { dead_list, carts } = game_vars
        let mafia_rols = ["nato", "godfather", "hostage_taker"]
        let mafia_death = dead_list.filter(dead => {
            let role = carts.find(cart => cart.user_id === dead.user_id)
            if (mafia_rols.includes(role.name)) return true
            return false
        })
        return `از بازی ${mafia_death.length} مافیا و ${dead_list.length - mafia_death.length} شهروند از بازی خارج شده`

    },


    use_gun({ game_vars, user_shot, user_resive_shot, socket, game_id, users }) {
        const { gun_status } = game_vars
        let selected_gun = gun_status.findIndex(g => g.user_id === user_shot)
        const { gun_type } = gun_status[selected_gun]
        socket.to(game_id).emit("used_gun", {
            data: {
                from_user: user_shot,
                to_user: user_resive_shot,
                kind: gun_type
            }
        })
        if (gun_type === "fighter") {
            game_vars.edit_event("push", "dead_list", user_resive_shot)
            const { turn } = game_vars
            let prv_queue = [...game_vars.queue]
            let user_to_add_queue = befor_start.pick_player_from_user_id({ users, user_id: user_resive_shot })
            const { user_id, index } = user_to_add_queue
            let clean_user = {
                speech_status: "challenge",
                pass: false,
                challenge_used: true,
                user_id,
                user_index: index
            }
            prv_queue.splice(turn + 1, 0, clean_user)
            // prv_queue = prv_queue.filter((e) => {
            //     if (e.user_id === user_resive_shot && e.speech_status !== "challenge") return false
            //     return true
            // })
            game_vars.edit_event("edit", "queue", prv_queue)
            game_vars.edit_event("edit", "player_reval", { user_id: user_resive_shot, turn: game_vars.turn + 2 })
        }

        let new_gun_status = [...gun_status]
        new_gun_status[selected_gun].used = true
        game_vars.edit_event("edit", "gun_status", new_gun_status)


    }



}


module.exports = start