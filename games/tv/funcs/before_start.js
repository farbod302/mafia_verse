const run_timer = require("../../../helper/timer");
const static_vars = require("../static_vars");
const static = require("../../../container/static")
const Users = require("../../../db/user")
const befor_start = {
    wait_to_join({ game_vars, abandon }) {
        let abandon_func = () => {
            let user_joined = game_vars.join_status.length
            if (user_joined !== static_vars.player_count) abandon()
        }
        run_timer(10, abandon_func)
    },


    async players_list_generate({ users }) {

        let users_device_id = users.map(user => user.device_id)
        let users_from_db = await Users.find({ user_id: { $in: users_device_id } })
        const player_clean_list = users.map((user, index) => {
            let sleced_user_from_db = users_from_db.find(d_user => user.device_id === d_user.device_id)
            return {
                index,
                user_id: user.uid,
                player_name: sleced_user_from_db ? `${sleced_user_from_db.idenity.name}` : "کاربر مهمان",
                avatar: `${static.url}/files/0.png`,
            }
        })
        return player_clean_list
    },


    player_status_generate({game_vars}){
        const {players_compleate_list}=game_vars
        let player_status_list=players_compleate_list.map((user,index)=>{
           return{
            user_index:index,
            user_id:user.uid,
            user_status:{
                is_connected:true,
                is_alive:true,
                is_talking:false
            },
            user_action:{
                like:false,
                dislike:false,
                challenge_request:false,
            }
           }
        })
        game_vars.edit_event("new_value","player_status",player_status_list,"player_status_generate")
    },

    shuffel_carts() {
        let carts = [...static_vars.rols]
        for (var i = carts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = carts[i];
            carts[i] = carts[j];
            carts[j] = temp;
        }
        return carts
    },

    pick_cart_phase({ game_vars ,users}) {
        let carts = this.shuffel_carts()
        game_vars.edit_event("new_value", "carts", carts.map((cart,index) => { return { name: cart, selected_by: null, selected: false ,id:index} }))
        game_vars.edit_event("edit", "queue", users, "pick_cart_phase from befor start")
        game_vars.edit_event("edit", "turn", -1, "pick_cart_phase from befor start")
        game_vars.edit_event("edit", "next_event", "next_player_pick_cart", "pick_cart_phase from befor start")
    },

    pick_random_cart({ game_vars }) {
        let { carts } = game_vars
        let free_carts = carts.filter(cart => !cart.selected)
        let remain_carts_count = free_carts.length - 1
        let random_index = Math.floor(Math.random() * remain_carts_count)
        return carts[random_index]
    },

    submit_cart_pick({contnue_func,game_vars,cart}){
        const {users,turn,carts,users_comp_list}=game_vars
        const {user_id}=users[turn]
        let user_comp_data=users_comp_list.filter(user=>user.user_id === user_id)
        const {avatar}=user_comp_data
        let new_carts_setup=[...carts]
        new_carts_setup[cart]={
            selected:true,
            selected_by:avatar,
            user_id,
            name:carts[cart].name
        }
        game_vars.edit_event("edit","carts",new_carts_setup,"submit_cart_pick")
        game_vars.edit_event("push","rols",{user_id,cart:carts[cart]})
        contnue_func()
    },

    set_timer_to_random_pick_cart({game_vars,socket,users}){
        const {turn,rols}=game_vars
        let random_pick_func=()=>{
            let {user_id}=users[turn]
            let is_selected=rols.find(role=>role.user_id===user_id)
            if(!is_selected){
                let random_cart=befor_start.pick_random_cart()
                let user=befor_start.pick_player_from_user_id({user:user_id})
                befor_start.submit_cart_pick({game_vars,cart:random_cart})
                socket.to(user.socket_id).emit("random_character",{data:{name:random_cart.name},scenario:static_vars.scenario})
            }
        }
        run_timer(5,random_pick_func)
    },

   pick_player_from_user_id({users,user_id}){
    let s_user=users.find(user=>user.uid === user_id)
    return s_user
   }
}

module.exports = befor_start