const Voice = require("../../../helper/live_kit_handler")
const User = require("../../../db/user")
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


    pick_live_users({game_vars}){
        let {player_status}=game_vars
    }
   

}


module.exports = start