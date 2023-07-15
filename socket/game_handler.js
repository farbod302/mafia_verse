const Game = require("../games/tv/game")

const game_handler = {
    create_game({ game_id,db,socket }) {
        let selected_game_to_start = db.getOne("games_queue", "game_id", game_id)
        if (!selected_game_to_start) return
        const { users, partys,senario } = selected_game_to_start
        let new_game = {
            mod: "robot",
            senario,
            users,
            modrators: [],
            game_id,
        }
        const game_handlers={
            abandon_game:(socket)=>{game_handler.abandon_game({game_id,socket,db})},
        }
        let game = new Game({ users, socket, game_id ,game_handlers})
        db.add_data("games", { ...new_game, game_class: game })
        for (let party of partys) {
           socket.to(party).emit("game_found", { game_id })
        }
        users.forEach(user => {
            console.log({game_id});
           socket.sockets.sockets.get(user.socket_id).join(game_id);
        })
        db.removeOne("games_queue","game_id",game_id)
       
       
    },

    abandon_game({game_id,socket,db}){
        console.log("im run");
       socket.to(game_id).emit("abandon")
       db.removeOne("game","game_id",game_id)
    }
}


module.exports=game_handler