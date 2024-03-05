const { uid } = require("uid")
const fs = require("fs")
const lobby = {
    create_lobby(client, data, socket) {
        const { name, scenario, player_cnt, characters, carts, type, password } = data
        const lobby_id = uid(5)
        const new_lobby = {
            name,
            scenario,
            player_cnt,
            characters,
            carts,
            type,
            password,
            creator: client.idenity,
            players: [],
            ban_list: [],
            started: false,
            messages: [],
            lobby_id
        }
        const lobby_list = this.add_lobby_to_json(new_lobby)
        socket.to("lobby_list").emit("lobby_list", { lobby_list })
        client.join(lobby_id)
        return lobby_id


    },
    add_lobby_to_json(lobby) {
        const cur_file_raw = fs.readFileSync(`${__dirname}/lobby.json`)
        const cur_file_json = JSON.parse(cur_file_raw.toString())
        const new_file = cur_file_json.concat(lobby)
        fs.writeFileSync(`${__dirname}/lobby.json`, JSON.stringify(new_file))
        return new_file.map(e => {
            delete e.password
            return e
        })
    },
    get_lobby_list(keep_pass) {
        const cur_file_raw = fs.readFileSync(`${__dirname}/lobby.json`)
        const cur_file_json = JSON.parse(cur_file_raw.toString())
        if (keep_pass) return cur_file_json
        return cur_file_json.map(e => {
            delete e.password
            return e
        })
    },
    update_lobbies(new_lobby_list) {
        fs.writeFileSync(`${__dirname}/lobby.json`, JSON.stringify(new_lobby_list))
    },
    join_lobby({ lobby_id, password, client }) {
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1 || cur_lobby_list[selected_lobby_index].started) return { status: false, msg: "لابی تکمیل است" }
        const { type, password: lobby_password, ban_list } = selected_lobby_index
        if (type === "private" && password !== lobby_password) return { status: false, msg: "کلمه عبور اشتباه است" }
        if (ban_list.includes(client.user_id)) return { status: false, msg: "شما اجازه ورود به این لابی را ندارید" }
        cur_lobby_list[selected_lobby_index].players.push(client)
        this.update_lobbies(cur_lobby_list)
        socket.to("lobby_list").emit("lobby_list", { lobby_list: cur_lobby_list })
        return { status: true, msg: "" }
    },
    kick_player({lobby_id,player_to_kick,client}){
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1) return { status: false, msg: "لابی یافت نشد" }
    }
}

module.exports = lobby