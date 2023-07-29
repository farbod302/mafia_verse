const find_match = require("./find_match")

const handel_disconnect=({client,db,socket})=>{

    //handel dc during find match
    find_match.leave_find({client,db,socket})
    let game_id=client.game_id
    if(game_id){
        let selected_game=db.getOne("games","game_id",game_id)
        const {game_class}=selected_game
        game_class.submit_user_disconnect({client})
        db.add_data("disconnect",{user_id:client.identity.user_id,game_id})
    }

}

module.exports=handel_disconnect