
const Jwt = require("../helper/jwt")
const { uid: uuid } = require("uid")
const online_users_handler = require("./online_users_handler")
const User = require("../db/user")
const join_handler = async ({ token, db, client, socket }) => {
    const user = Jwt.verify(token)
    if (!user) return
    const { uid } = user
    let s_user = await User.findOne({ uid })
    let user_party = uuid(5)
    let idenity = {
        socket_id: client.id,
        party_id: user_party,
        user_id: uid,
        name: s_user.idenity.name,
        image: `files/${s_user.avatar.avatar}`
    }
    console.log({ uid });
    online_users_handler.add_user(uid, client.id)
    let user_exist_game = db.getOne("disconnect", "user_id", uid)
    if (user_exist_game) {
        console.log({ user_exist_game ,socket_id:client.id});
        let s_game = db.getOne("games", "game_id", user_exist_game.game_id)
        const { carts } = s_game.game_class.game_vars
        let user_char = carts.find(e => e.user_id === uid) || null
        socket.to(client.id).emit("reconnect_notification", {
            data: {
                game_id: user_exist_game.game_id,
                game_scenario: "nato",
                is_player: true,
                is_supervisor: false,
                character: user_char?.name || null
            }
        })
    }
    client.join(user_party)
    client.idenity = idenity
    db.add_data("users", idenity)
    db.add_data("party", {
        party_id: user_party,
        users: [idenity]
    })
    socket.to(client.id).emit("join_status", { data: { user_id: uid } })
}

module.exports = join_handler