const { uid } = require("uid")
const start = require("./start")
const befor_start = require("./before_start")

const night = {

    async generate_room_for_mafia({ game_vars, users, socket }) {
        const { carts } = game_vars
        const mafai_rols = ["godfather", "nato"]
        let users_pick_mafia = carts.filter(user => mafai_rols.includes(user.name))
        let random_room_id = uid(4)
        let users_pick_mafia_ids = users_pick_mafia.map(user => user.user_id)
        let mafia = users.filter(user => users_pick_mafia_ids.includes(user.uid))
        await start.create_room_for_mafia({ mafia, socket, room_id: random_room_id })

    },

    start_night({ game_vars, socket, game_id }) {
        const { day } = game_vars
        game_vars.edit_event("edit", "time", "night")
        socket.to(game_id).emit("game_event", { data: { game_event: "night" } })
        game_vars.edit_event("edit", "next_event", "guard_and_hostage_taker_act")
    },

    emit_to_act({ user_id, list_of_users_can_targeted, users, socket }) {
        let selected_user = befor_start.pick_player_from_user_id({ users, user_id })
        if (!selected_user) return
        //check alive
        const { socket_id } = selected_user
        socket.to(socket_id).emit("use_ability", { data: { max_count: 1, list_of_users_can_targeted } })
        //todo add max count 

    },

    guard_and_hostage_taker_act({ game_vars, users, socket }) {
        const users_to_act = ["hostage_taker", "guard"]
        const { carts } = game_vars
        for (let act of users_to_act) {
            let user_id = carts.find(cart => cart.name === act)
            let list_of_users_can_targeted = this.pick_user_for_act({ game_vars, act, user_id })
            this.emit_to_act({
                user_id, list_of_users_can_targeted, users, socket, can_act: true, msg: ""
            })
        }
    },

    mafia_shot({ game_vars, users, socket }) {
        this.generate_room_for_mafia({ game_vars, users, socket })
        const { carts } = game_vars
        let godfather = carts.find(cart => cart.name === "godfather")
        const { user_id } = godfather
        let godfather_user = start.pick_player_from_user_id({ users, user_id })
        let list_of_users_can_targeted = this.pick_user_for_act({ game_vars, act: "mafia", user_id })
        socket.to(godfather_user.socket_id).emit("use_ability", {
            data: { max_count: 1, list_of_users_can_targeted, can_act: true, msg: "" }
        })
    },

    other_acts({ game_vars, users, socket, records }) {
        let acts_used = ["gurd", "nato", "godfather", "hostage_taker"]
        const { carts } = game_vars
        let users_remain = carts.filter(cart => !acts_used.includes(cart.name))
        for (let act of users_remain) {
            let { can_act, msg } = this.check_act({ records, act })
            let { user_id } = carts
            let list_of_users_can_targeted = this.pick_user_for_act({ game_vars, act: act.name, user_id })
            this.emit_to_act({ user_id, list_of_users_can_targeted, users, socket, can_act, msg })
        }
    },

    check_act({ records, act, game_vars }) {
        const { name, user_id } = act
        let hostage_taker_act = records.find(each_act => each_act.act === "hostage_taker")
        hostage_taker_act = hostage_taker_act.targets || []
        switch (name) {
            case ("commando"): {
                let mafia_shot = records.find(each_act => each_act.act === "mafia_shot")
                mafia_shot = mafia_shot.targets || []
                //check _shot
                let can_act = false
                let msg = "شما نمی توانید امشب از توانایی خود استفاده کنید"
                let is_targeted = mafia_shot.includes(user_id)
                if (is_targeted) { can_act = true; msg = "" }
                if (hostage_taker_act.includes(user_id) && is_targeted) {
                    can_act = false;
                    msg = "شما توسط مافیا مورد هدف قرار گرفتید ولی نمی توانید از توانایی خود استفاده کنید"
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
        switch (act) {
            case ("doctor"): {
                let live_users = start.pick_live_users({ game_vars })
                const { doctor_self_save } = game_vars
                if (doctor_self_save) {
                    live_users = live_users.filter(user => user.user_id !== user_id)
                }
                return live_users
            }
            case ("mafia"): {
                const { mafia } = game_vars
                let mafia_ids = mafia.map(user => user.user_id)
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => !mafia_ids.includes(user.user_id))
                return live_users
            }

            case("detective"):{
                const {users_gurd_check}=game_vars
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => user.user_id !== user_id && !users_gurd_check.includes(user.user_id))
                return live_users
            }

            default: {
                let live_users = start.pick_live_users({ game_vars })
                live_users = live_users.filter(user => user.user_id !== user_id)
                return live_users
            }
        }
    },


    night_act_handler({ user_id, game_vars, act, targets,socket,idenity }) {
        switch (act) {
            case ("doctor"): {
                if (targets.includes(user_id)) { game_vars.edit_event("edit", "doctor_self_save", true) }
                return
            }
            case("detective"):{
                let mafia_acts=["nato","hostage_taker"]
                let user_to_check=targets[0].user_id
                let target=game_vars.carts.find(cart=>cart.user_id === user_to_check)
                let status=mafia_acts.includes(target.name)
                socket.to(idenity.socket_id).emit("check_result",{data:{mafia:status}})
                game_vars.edit_event("push","users_gurd_check",user_to_check)
            }
        }
    },


    night_results({ game_vars, records, socket }) {

    }




}

module.exports = night