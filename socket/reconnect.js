const handel_reconnect = ({ client, db ,socket}) => {
    const { user_id } = client.idenity
    let game_to_join = db.getOne("disconnect", "user_id", user_id)
    if (!game_to_join) return
    const { game_id,is_mod } = game_to_join
    let selected_game = db.getOne("games", "game_id", game_id)
    const { game_class } = selected_game
    if(is_mod){
        game_class.re_connect_mod({client})
    }else{
        game_class.re_connect({ client })
    }
    socket.sockets.sockets.get(client.id).join(game_id);
}