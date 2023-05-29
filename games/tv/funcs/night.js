const { uid } = require("uid")
const start = require("./start")

const night = {

    async generate_room_for_mafia({ game_vars, users, socket }) {
        const { carts } = game_vars
        const mafai_rols = ["godfather", "nato", "hostage_taker"]
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
        game_vars.edit_event("push", "night_events", { night: day,events:[] })
    },

    emit_to_act(){
        
    }


}

module.exports = night