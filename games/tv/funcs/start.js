const Voice = require("../../../helper/live_kit_handler")
const User = require("../../../db/user")
const befor_start = require("./before_start")
const run_timer = require("../../../helper/timer")
const { encrypt } = require("../../../helper/helper")
const start = {

    async create_live_room({ game_id, game_vars, socket }) {
        await Voice.start_room(game_id)
        const { users } = game_vars
        for (let user of users) {
            const { user_id, socket_id } = user
            let token = Voice.join_room(user_id, game_id)
            socket.to(socket_id).emit("voice_bridge_token", { token })
        }
    },


    pick_live_users({ game_vars }) {
        let { player_status } = game_vars
        let live_users = player_status.filter(user => user.user_status.is_alive)
        return live_users
    },

    generate_queue({ type, game_vars, users }) {
        let live_users = users
        if (!live_users) live_users = befor_start.pick_live_users({ game_vars })
        let queue = live_users.map(user => {
            const { user_id, user_index } = user
            return {
                user_id, user_index, speech_status: type, pass: false
            }
        })
        return queue

    },

    edit_game_action({ index, prime_event, second_event, new_value, game_vars, edit_others }) {
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

    },

    move_speech_queue({ game_vars }) {
        const { turn, queue } = game_vars
        let new_queue = [...queue].map((user, index) => {
            return { ...user, pass: index < turn ? true : false }
        })
        game_vars.edit_event("edit", "queue", new_queue)
    },

    set_timer_to_contnue_speech_queue({ func, game_vars,time,socket ,users}) {
        const { queue, player_status } = game_vars
        let speeching_user = queue.find(user => !user.pass)
        const {socket_id}=users.find(user=>speeching_user.user_id === user.uid)
        const timer_func = () => {
            let s_player = player_status.find(player => player.user_id === speeching_user.user_id)
            if (s_player.is_talking) {
                socket.to(socket_id).emit("speech_time_up")
                func()
            }
        }
        run_timer(time,timer_func)
    },

    mafia_reval({game_vars,users,socket}){
        const {carts}=game_vars
        const mafai_rols=["godfather","nato","hostage_taker"]
        let users_pick_mafia=carts.filter(user=>mafai_rols.includes(user.name))
        let users_pick_mafia_ids=users_pick_mafia.map(user=>user.user_id)
        let mafia=users.filter(user=>users_pick_mafia_ids.includes(user.uid))
        mafia.forEach(user=>{
            socket.to(user.socket_id).emit("mafia_visitation",{data:{mafia:encrypt(JSON.stringify(users_pick_mafia))}})
        })

    }


}


module.exports = start