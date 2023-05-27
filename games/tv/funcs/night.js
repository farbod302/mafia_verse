const night={
    start_night({game_vars,socket,game_id}){
        game_vars.edit_event("edit","time","night")
        socket.to(game_id).emit("game_event",{data:{game_event:"night"}})
    }
}