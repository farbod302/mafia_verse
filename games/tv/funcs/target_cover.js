const targetCover = {
    enable_target_cover({ game_event, users, socket }) {
        const { game_id, turn, target_cover_queue ,defenders} = game_event
        if(!target_cover_queue.length){
            this.game_vars.edit_event("edit","custom_queue",defenders)
            this.game_vars.edit_event("edit","next_event","start_speech")
            return
        }
        this.game_vars.edit_event("edit","next_event","next_target_cover")
        socket.to(game_id).emit("game_event",{data:"tag"})
    },

    next_target_cover({game_vars,users}){
        game_vars.edit_event("edit","turn","plus")
        const {target_cover_queue,turn}=game_vars
        if(turn === target_cover_queue.length){
            console.log("END");
        }
        
        
    }
}

module.exports=targetCover