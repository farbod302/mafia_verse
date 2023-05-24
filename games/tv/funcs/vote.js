const run_timer = require("../../../helper/timer")
const start = require("./start")

const vote = {
    start_vote({ game_vars }) {
        const { custom_queue, vote_type } = game_vars
        let users_to_vote = vote_type === "pre_vote" ? custom_queue : start.pick_live_users()
        game_vars.edit_event("edit", "queue", users_to_vote)
        game_vars.edit_event("edit", "turn", -1)
        game_vars.edit_event("edit", "next_event", "next_player_vote_time")

    },
    next_player_vote_turn({ game_vars, socket, game_id,cycle }) {
        game_vars.edit_event("edit", "turn", "plus")
        const { queue, turn,vote_type} = game_vars
        let new_vote_record= { user_id: queue[turn].user_id, users: [] ,vote_type}
        game_vars.edit_event("push", "votes_status",new_vote_record)
        socket.to(game_id).emit("vote",{data:new_vote_record})
        run_timer(5,cycle)
    },
    submit_vote({client,socket,game_vars,game_id}){

        const {turn,votes_status}=game_vars
        let new_vote_status=[...votes_status]
        new_vote_status[turn].users.push(client.idenity.uid)
        game_vars.edit_event("edit","votes_status",new_vote_status)
        socket.to(game_id).emit("vote",{data:new_vote_status})

    },


    arange_defence({game_vars}){
        const {votes_status}=game_vars
        let users_to_defence=votes_status.filter(user)
    }
}

module.exports = vote