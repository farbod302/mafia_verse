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
        game_vars.edit_event("push", "nigth_reports", { night: day,events:[] })
        console.log("Night started");
    },

    emit_to_act({user_id,list_of_users_can_targeted,users,socket}){
        let selected_user=befor_start.pick_player_from_user_id({users,user_id})
        const{socket_id}=selected_user
        socket.to(socket_id).emit("use_ability",{data:{max_count:1,list_of_users_can_targeted}})
        //todo add max count 
        
    },

    guard_and_hostage_taker_act({game_vars,users,socket}){

        const users_to_act= ["hostage_taker","guard"]
        const {carts}=game_vars
        for (let act of users_to_act){
            let user_id=carts.find(cart => cart.name === act)
            let list_of_users_can_targeted=this.pick_user_for_act({game_vars,act,user_id})
            this.emit_to_act({user_id,list_of_users_can_targeted,users,socket})
        }
    },

    pick_user_for_act({game_vars,act,user_id}){
        switch(act){
            case("doctor"):{return []}
            default:{
                let live_users=start.pick_live_users({game_vars})
                live_users=live_users.filter(user=>user.user_id !== user_id)
                return live_users
            }
        }
    }





}

module.exports = night