const { uid } = require("uid")
const start = require("./start")
const befor_start = require("./before_start")
const { delay } = require("../../../helper/helper")
const { character_translator } = require("../../../helper/helper")
const data_handler = require("../../../games_temp_data/data_handler")
const _play_voice = require("./play_voice")

const night = {

    async generate_room_for_mafia({ game_vars, users, socket }) {
        const { carts } = game_vars
        const mafia_roles = ["godfather", "nato"]
        let users_pick_mafia = carts.filter(user => mafia_roles.includes(user.name))
        let random_room_id = uid(4)
        let users_pick_mafia_ids = users_pick_mafia.map(user => user.user_id)
        let mafia = users.filter(user => users_pick_mafia_ids.includes(user.user_id))
        await start.create_room_for_mafia({ mafia, socket, room_id: random_room_id })

    },

    start_night({ game_vars, socket, game_id }) {
        socket.to(game_id).emit("action_end")
        game_vars.edit_event("edit", "time", "night")
        socket.to(game_id).emit("game_event", { data: { game_event: "night" } })
        game_vars.edit_event("edit", "next_event", "guard_and_hostage_taker_act")
        game_vars.edit_event("edit", "gun_status", [])
    },

    emit_to_act({ user_id, availabel_users, users, socket, can_act, msg, game_vars, max_count, play_voice }) {
        const { player_status } = game_vars
        const s_user = player_status.find(e => e.user_id === user_id)
        if (!s_user || !s_user.user_status?.is_alive) return
        let selected_user = befor_start.pick_player_from_user_id({ users, user_id })
        if (!selected_user) return
        //check alive
        const { socket_id } = selected_user
        play_voice(_play_voice.play_voice("act_time"), user_id)
        socket.to(socket_id).emit("use_ability", { data: { max_count: max_count || 1, availabel_users, can_act, msg: msg || "", timer: 10 } })
        //todo add max count 

    },

    guard_and_hostage_taker_act({ game_vars, users, socket, play_voice }) {
        const users_to_act = ["hostage_taker", "guard"]
        play_voice(_play_voice.play_voice("guard_hostage_taker_act_time"))
        const { carts } = game_vars
        setTimeout(() => {
            for (let act of users_to_act) {
                let user = carts.find(cart => cart.name === act)
                if (!user?.user_id) continue
                const { user_id } = user
                let { availabel_users, max_count } = this.pick_user_for_act({ game_vars, act, user_id })
                this.emit_to_act({
                    user_id, availabel_users, users, socket, can_act: true, msg: "", game_vars, max_count, play_voice
                })
            }
        }, 3000)
    },

    async mafia_speech({ game_vars, users, socket }) {
        const { mafia_list, dead_list } = game_vars
        let users_can_cop = ["godfather", "nato"]
        let speech_list = mafia_list.filter(mafia =>
            users_can_cop.includes(mafia.role) &&
            !dead_list.includes(mafia.user_id))
        if (speech_list.length === 2) {
            await this.generate_room_for_mafia({ game_vars, users, socket })
            game_vars.edit_event("edit", "mafia_speak", true)
            game_vars.edit_event("edit", "mafia_need_token", speech_list)

        }
        await delay(25)
        game_vars.edit_event("next_event", "check_mafia_decision")
    },

    check_mafia_decision({ game_vars, users, socket, play_voice }) {

        const { mafia_list, dead_list } = game_vars
        let act_sort = ["godfather", "nato", "hostage_taker"]
        let mafia_list_in_order = act_sort.map(act => mafia_list.find(mafia => mafia.role === act))
        //remove after debug
        mafia_list_in_order = mafia_list_in_order.filter(e => e)
        //
        let shoot_permision = mafia_list_in_order.filter(mafia => !dead_list.includes(mafia.user_id))
        let nato = mafia_list.find(mafia => mafia.role === "nato")
        const { nato_act } = game_vars
        let can_use_nato = nato && !dead_list.includes(nato.user_id) && !nato_act ? true : false

        const { user_id } = shoot_permision[0]
        let user_to_emit = befor_start.pick_player_from_user_id({ users, user_id })
        const { socket_id } = user_to_emit
        game_vars.edit_event("edit", "user_to_shot", user_to_emit)
        if (can_use_nato) {
            socket.to(socket_id).emit("mafia_decision", { nato_availabel: true, timer: 7 })
            play_voice(_play_voice.play_voice("godfather_chosen"), user_id)

        }
        // else {
        //     socket.to(socket_id).emit("mafia_shot", {
        //         timer: 10,
        //         max: 1,
        //         availabel_users: this.pick_user_for_act({ game_vars, act: "mafia", user_id })
        //     })
        // }


    },

    mafia_shot({ game_vars, socket, socket_finder }) {
        let { user_id } = game_vars.user_to_shot
        const socket_id = socket_finder(user_id)
        const { availabel_users } = this.pick_user_for_act({ game_vars, act: "mafia", user_id })
        socket.to(socket_id).emit("mafia_shot", {
            timer: 15,
            max: 1,
            availabel_users
        })
    },

    use_nato({ game_vars, users, socket, game_id, play_voice }) {
        const { carts } = game_vars
        let nato = carts.find(cart => cart.name === "nato")
        const { user_id } = nato
        let { availabel_users } = this.pick_user_for_act({ game_vars, act: "nato", user_id })
        socket.to(game_id).emit("report", { data: { msg: "مافیا اعلام ناتویی کرده است", timer: 3 } })
        this.play_voice(_play_voice.play_voice("announce_natoe"))
        setTimeout(() => {
            this.emit_to_act({ user_id, availabel_users, users, socket, can_act: true, game_vars, max_count: 1, play_voice })
        }, 4000)
    },

    other_acts({ game_vars, users, socket, records, play_voice }) {
        let acts_used = ["guard", "nato", "godfather", "hostage_taker", "citizen"]
        const { carts } = game_vars
        let users_remain = carts.filter(cart => !acts_used.includes(cart.name))

        for (let act of users_remain) {
            let { can_act, msg } = this.check_act({ records, act, game_vars })
            let { user_id, name } = act
            let { availabel_users, max_count } = this.pick_user_for_act({ game_vars, act: name, user_id })
            this.emit_to_act({ user_id, availabel_users, users, socket, can_act, msg, game_vars, max_count, play_voice })
        }
    },


    check_act({ records, act, game_vars }) {
        const { name, user_id } = act
        let hostage_taker_act = records.events.filter(each_act => each_act.act === "hostage_taker")
        hostage_taker_act = hostage_taker_act.map(target => target.target)
        let guard_act = records.events.filter(each_act => each_act.act === "guard")
        guard_act = guard_act.map(target => target.target)
        const hostage_taker_id = game_vars.carts.find(e => e.name === "hostage_taker")
        if (guard_act.includes(hostage_taker_id)) hostage_taker_act = []
        hostage_taker_act = hostage_taker_act.filter(e => !guard_act.includes(e))

        switch (name) {
            case ("commando"): {
                let mafia_shot = records.events.find(each_act => each_act.act === "mafia_shot")
                mafia_shot = mafia_shot?.target || null
                //check _shot
                let can_act = false
                let msg = "امشب توسط مافیا مورد هدف قرار نگرفتی"
                let is_targeted = mafia_shot === user_id
                if (is_targeted) { can_act = true; msg = "" }
                if (hostage_taker_act.includes(user_id) && is_targeted) {
                    can_act = false;
                    msg = "شما توسط مافیا مورد هدف قرار گرفتید ولی نمی توانید از توانایی خود استفاده کنید"
                }
                if (game_vars.comondo_gun_used) {
                    can_act = false
                    msg = "شما از تیر خود استفاده کرده اید"
                }
                return { can_act, msg }
            }
            case ("rifleman"): {
                const { real_gun_used } = game_vars
                let can_act = !hostage_taker_act.includes(user_id)
                if (can_act && !real_gun_used) {
                    return { can_act, msg: "" }
                }
                return { can_act: false, msg: "شما نمی توانید از توانایی خود استفاده کنید" }
            }
            default: {
                let can_act = !hostage_taker_act.includes(user_id)
                return { can_act, msg: can_act ? "" : "شما نمی توانید امشب از توانایی خود استفاده کنید" }
            }
        }

    },

    pick_user_for_act({ game_vars, act, user_id }) {
        const mafia_acts = ["mafia", "nato", "hostage_taker"]
        if (mafia_acts.includes(act)) act = "mafia"
        switch (act) {
            case ("doctor"): {
                let live_users = start.pick_live_users({ game_vars })
                let live_count = start.pick_live_users({ game_vars })
                const { doctor_self_save } = game_vars
                if (doctor_self_save) {
                    live_users = live_users.filter(user => user.user_id !== user_id)
                }
                return {
                    availabel_users: live_users.map(user => user.user_id),
                    max_count: live_count.length >= 8 ? 2 : 1
                }
            }
            case ("mafia"): {
                const { mafia_list } = game_vars
                let mafia_ids = mafia_list.map(user => user.user_id)
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => !mafia_ids.includes(user.user_id))
                return { availabel_users: live_users.map(e => e.user_id), max_count: 1 }
            }

            case ("detective"): {
                const { users_gurd_check } = game_vars
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => user.user_id !== user_id && !users_gurd_check.includes(user.user_id))
                return { availabel_users: live_users.map(user => user.user_id), max_count: 1 }
            }


            case ("guard"): {
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => user.user_id !== user_id)
                return {
                    availabel_users: live_users.map(e => e.user_id),
                    max_count: live_users.length + 1 >= 8 ? 2 : 1
                }
            }

            default: {
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => user.user_id !== user_id)
                return { availabel_users: live_users.map(user => user.user_id), max_count: 1 }
            }
        }
    },


    night_act_handler({ user_id, game_vars, act, targets, socket, idenity, users }) {
        switch (act) {
            case ("doctor"): {
                const targets_user_id = targets.map(e => e.user_id)
                if (targets_user_id.includes(user_id)) { game_vars.edit_event("edit", "doctor_self_save", true) }
                return
            }
            case ("detective"): {
                let mafia_acts = ["nato", "hostage_taker"]
                let user_to_check = targets[0].user_id
                let target = game_vars.carts.find(cart => cart.user_id === user_to_check)
                let status = mafia_acts.includes(target.name)
                socket.to(idenity.socket_id).emit("detective_inquiry", { inquiry: status, user_id: user_to_check })
                game_vars.edit_event("push", "users_detective_check", user_to_check)
                return
            }

            case ("rifleman"): {
                // game_vars.edit_event("edit", "gun_status", targets)
                let real_gun = targets.find(gun => gun.act === "fighter")
                if (real_gun) game_vars.edit_event("edit", "real_gun_used", true)
                targets.forEach(target => {
                    let user = befor_start.pick_player_from_user_id({ users, user_id: target.user_id })
                    const { socket_id } = user
                    socket.to(socket_id).emit("report_gun")
                    game_vars.edit_event("push", "gun_status", { user_id: target.user_id, gun_type: target.act, used: false })
                })
                return

            }


            case ("commando"): {
                game_vars.edit_event("edit", "comondo_gun_used", true)
                return
            }
        }
    },


    async night_results({ game_vars, records, users, socket, game_id }) {
        const { carts } = game_vars
        let mafia_shot = records.find(act => act.act === "mafia_shot")
        let mafia_target = mafia_shot?.target || null
        let deth = null
        let abs_deth = null
        if (mafia_target) {
            if (mafia_target) {
                deth = mafia_target
            }
            //check comondo act
            const comondo_act = records.find(act => act.act === "commando")
            if (comondo_act) {
                const comondo_shot = comondo_act?.target
                if (comondo_shot) {
                    let user_targeted_by_comondo = carts.find(cart => cart.user_id === comondo_shot)
                    let mafia_rols = ["godfather", "nato", "hostage_taker"]
                    if (!mafia_rols.includes(user_targeted_by_comondo.name)) {
                        let comondo = carts.find(cart => cart.name === "commando")
                        abs_deth = comondo.user_id
                        deth = null
                    }
                    else {
                        if (user_targeted_by_comondo.name === "godfather") deth = null
                        else {
                            deth = user_targeted_by_comondo.user_id
                            game_vars.edit_event("edit", "comondo_true_shot", true)
                        }
                    }
                }

            }
            //check doctor act
            const doctor_save = records.filter(act => act.act === "doctor")
            if (doctor_save.length) {
                doctor_save.forEach(save => {
                    if (save.target === deth) {
                        deth = null
                        game_vars.edit_event("edit", "comondo_true_shot", false)
                    }
                })
            }
        }
        else {
            const nato_act = records.find(act => act.act === "nato")
            if (nato_act) {
                const { target, info } = nato_act
                let user_true_role = carts.find(cart => cart.user_id === target)
                user_true_role = user_true_role.name
                if (info === user_true_role) abs_deth = target
            }

        }
        let user_to_kill = abs_deth || deth
        data_handler.add_data(game_id, { user: "server", op: "night_result", data: { abs_deth, deth } })
        //todo : tell night over

        await delay(3)

        if (user_to_kill) {
            let index = users.findIndex(user => user.user_id === user_to_kill)
            start.edit_game_action({
                index,
                prime_event: "user_status",
                second_event: "is_alive",
                new_value: false,
                game_vars
            })
            const { player_status } = game_vars
            socket.to(game_id).emit("game_action", { data: [player_status[index]] })
            game_vars.edit_event("push", "dead_list", user_to_kill)
            let prv_player_status = [...game_vars.player_status]
            let user_index = prv_player_status.findIndex(u => u.user_id === user_to_kill)
            prv_player_status[user_index].user_status.is_alive = false
            game_vars.edit_event("edit", "player_status", prv_player_status)
            game_vars.edit_event("edit", "report_data",
                {
                    user_id: user_to_kill,
                    event: "night_result",
                    msg: !game_vars.comondo_true_shot ?
                        "دیشب یک نفر از بازی خداحافظی کرد" :
                        "آفرین به نکاور این شهر,از بازی یک نفر خارج شد"
                })
            game_vars.edit_event("edit", "comondo_true_shot", false)
        }
        else {
            game_vars.edit_event("edit", "report_data",
                {
                    user_id: null,
                    event: "night_result",
                    msg: "دیشب هیچ کس بازی را ترک نکرد"
                })
        }
        let next_event = this.check_next_day({ game_vars })
        if (next_event === 3) {
            game_vars.edit_event("edit", "next_event", "chaos")
            return
        }
        if (next_event === 4) {
            game_vars.edit_event("edit", "next_event", "next_day")
            return

        } else {
            let winner = next_event === 1 ? "citizen" : "mafia"
            game_vars.edit_event("edit", "next_event", "end_game")
            game_vars.edit_event("new_value", "winner", winner)

        }

    },


    check_next_day({ game_vars }) {
        // return 4
        let live_users = start.pick_live_users({ game_vars })
        const { carts } = game_vars
        let mafia_rols = ["godfather", "nato", "hostage_taker"]
        let live_users_with_role = live_users.map(user => {
            const { user_id } = user
            let user_role = carts.find(cart => cart.user_id === user_id)
            return {
                user_id,
                role: user_role.name
            }
        })
        let mafia_remain = live_users_with_role.filter(user => mafia_rols.includes(user.role))
        let city = live_users_with_role.filter(user => !mafia_rols.includes(user.role))
        if (!mafia_remain.length) return 1
        if (city.length <= mafia_remain.length) return 2
        if (live_users.length === 3) return 3
        return 4
    },


    async next_day({ game_vars, socket, game_id }) {
        socket.to(game_id).emit("action_end")
        game_vars.edit_event("edit", "day", "plus")
        game_vars.edit_event("edit", "time", "day")
        socket.to(game_id).emit("game_event", { data: { game_event: "day" } })
        await delay(5)
        start.generate_report({
            game_vars,
            report_type: "day_report",
            socket,
            game_id
        })
        game_vars.edit_event("edit", "custom_queue", [])
        game_vars.edit_event("edit", "votes_status", [])
        game_vars.edit_event("edit", "speech_type", "turn")
    },



    emit_to_mod({ game_vars, socket_finder, mod, event, msg, socket }) {
        if (!mod) return
        let mod_socket = socket_finder(mod)
        if (msg) {
            return socket.to(mod_socket).emit("mod_panel_events",
                {
                    data:
                        { msg_type: "server", header_msg: msg, content: {}, id: uid(5) }
                })
        }
        else {
            const { from, to } = event
            const { users_comp_list, carts } = game_vars

            let content = {
                from: (() => {
                    let s_user = users_comp_list.find(l => l.user_id === from)
                    let user_role = carts.find(c => c.user_id === from)
                    let character = character_translator(user_role.name)
                    return {
                        ...s_user,
                        character
                    }
                })(),
                to: to.map(e => {
                    let s_user = users_comp_list.find(l => l.user_id === e.user_id)
                    let user_role = carts.find(c => c.user_id === e.user_id)
                    let character = character_translator(user_role.name)
                    return {
                        ...s_user,
                        character
                    }
                })
            }
            return socket.to(mod_socket).emit("mod_panel_events",
                {
                    data:
                        { msg_type: "event", header_msg: "", content, id: uid(5) }
                })

        }

    }



}

module.exports = night