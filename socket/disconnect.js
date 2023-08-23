const find_match = require("./find_match")
const online_users_handler = require("./online_users_handler")

const handel_disconnect = ({ client, db, socket }) => {
    console.log("dc");
    //handel dc during find match
    find_match.leave_find({ client, db, socket })
    let game_id = client.game_id
    if (game_id) {
        let selected_game = db.getOne("games", "game_id", game_id)
        const { game_class } = selected_game
        if (game_class.game_vars.is_end) {
            game_class.submit_user_disconnect({ client })
            db.add_data("disconnect", { user_id: client.idenity.user_id, game_id })
        }
    }
    online_users_handler.remove_user(client.idenity?.user_id)

}

module.exports = handel_disconnect