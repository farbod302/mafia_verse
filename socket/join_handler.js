
const Jwt = require("../helper/jwt")
const { uid: uuid } = require("uid")
const fs = require("fs")
const online_users_handler = require("./online_users_handler")
const User = require("../db/user")
const join_handler = async ({ token, db, client, socket }) => {
    const user = Jwt.verify(token)
    console.log({ token });
    if (!user) return
    const version = fs.readFileSync(`${__dirname}/../version.json`)
    const { v } = JSON.parse(version.toString())
    const { uid } = user
    const online_users = online_users_handler.get_online_users()
    const is_online = online_users.find(e => e.user_id === uid && e.token !== token.slice(-10))
    if (is_online) {
        client.emit("force_exit")
        return
    }
    let s_user = await User.findOne({ uid })
    if (!s_user) return
    let user_party = uuid(5)
    let idenity = {
        socket_id: client.id,
        party_id: user_party,
        user_id: uid,
        name: s_user.idenity.name,
        image: `files/${s_user.avatar.avatar}`
    }
    online_users_handler.add_user(uid, client.id, token)
    let user_exist_game = db.getOne("disconnect", "user_id", uid)
    if (user_exist_game) {
        console.log({ user_exist_game, socket_id: client.id });
        let s_game = db.getOne("games", "game_id", user_exist_game.game_id)
        if (!s_game) return
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
    socket.to(client.id).emit("join_status", { data: { user_id: uid, auth: (s_user.age && s_user.age > 16) ? true : false, v, server_update: false } })
}

module.exports = join_handler