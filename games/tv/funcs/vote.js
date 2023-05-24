const start = require("./start")

const vote = {
    start_vote({ game_vars }) {
        const {custom_queue,vote_type}=game_vars
        let users_to_vote=vote_type === "pre_vote"?custom_queue:start.pick_live_users()
        game_vars.edit_event("edit","queue",users_to_vote)
        game_vars.edit_event("edit","turn",-1)
        game_vars.edit_event("edit","next_event","next_player_vote_time")

    }
}

module.exports=vote