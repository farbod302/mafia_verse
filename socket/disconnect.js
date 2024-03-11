const UserChannelConfig = require("../db/user_channel_config")
const find_match = require("./find_match")
const lobby = require("./lobby")
const online_users_handler = require("./online_users_handler")

const handel_disconnect = async ({ client, db, socket }) => {
    //handel dc during find match
    find_match.leave_find({ client, db, socket })
    let game_id = client.game_id
    if (game_id) {
        let selected_game = db.getOne("games", "game_id", game_id)
        if (!selected_game) return client.game_id = null
        const { game_class } = selected_game
        if (!game_class.game_vars.is_end) {
            const is_mod = game_class.submit_user_disconnect({ client })
            db.add_data("disconnect", { user_id: client.idenity.user_id, game_id, is_mod })
            console.log("submit user to dc", { user_id: client.idenity.user_id, game_id, is_mod });
        }

    }
    if (client.idenity?.lobby_id) {
        lobby.leave_lobby({ lobby_id: client.idenity.lobby_id, client, socket })
        const user_game = db.getOne("custom_game", "lobby_id", client.idenity.lobby_id)
        user_game.game_class.submit_player_disconnect({ user_id: client.idenity.user_id })

    }
    online_users_handler.remove_user(client.idenity?.user_id)
    const user_id = client.idenity?.user_id
    const prv_channel = client.channel_data
    if (!user_id || !prv_channel) return
    await UserChannelConfig.updateOne({ user_id, channel_id: prv_channel.channel_id }, { $set: { last_visit: Date.now() } })
    if (client.local_game_data) {
        const { game_id, user_id } = client.local_game_data
        const local_game = db.getOne("local_game", "local_game_id", game_id)
        if (local_game) {
            local_game.game_class.users_leave(user_id)
        }
    }



}

module.exports = handel_disconnect