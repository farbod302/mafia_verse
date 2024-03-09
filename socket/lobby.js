const { uid } = require("uid")
const fs = require("fs")
const { get_user_socket_id } = require("./online_users_handler")
const lockFile = require('lockfile');
const lock_path = `${__dirname}/lobby.json.lock`

const lockOptions = {
    wait: 1000,
    stale: 5000,
    retries: 100,
    retryWait: 1000
};
const lobby = {
    create_lobby(client, data, socket) {
        console.log({data});
        const { name, scenario, player_cnt, characters, cards, private, password,sides } = data
        const lobby_id = uid(5)
        const new_lobby = {
            name,
            scenario,
            player_cnt,
            characters,
            cards,
            private,
            password,
            creator: client.idenity,
            players: [],
            ban_list: [],
            started: false,
            messages: [],
            lobby_id,
            sides
        }
        const lobby_list = this.add_lobby_to_json(new_lobby)
        socket.to("lobby_list").emit("lobby_list", { lobby_list })
        client.join(lobby_id)
        return lobby_id


    },
    add_lobby_to_json(lobby) {
        lockFile.lock(lock_path, lockOptions, (err) => {
            const cur_file_raw = fs.readFileSync(`${__dirname}/lobby.json`)
            const cur_file_json = JSON.parse(cur_file_raw.toString())
            const new_file = cur_file_json.concat(lobby)
            fs.writeFile(`${__dirname}/lobby.json`, JSON.stringify(new_file), () => {
                lockFile.unlock(lock_path, (err) => {
                    return new_file.map(e => {
                        delete e.password
                        return e
                    })
                })
            })
        })
    },
    get_lobby_list(keep_pass) {
        const file=lockFile.lock(lock_path, lockOptions, (err) => {
            console.log({err});
            const cur_file_raw = fs.readFileSync(`${__dirname}/lobby.json`)
            const cur_file_json = JSON.parse(cur_file_raw.toString())
            console.log({cur_file_json});
            const file=lockFile.unlock(lock_path, (err) => {
                if (keep_pass) return cur_file_json
                return cur_file_json.map(e => {
                    delete e.password
                    return e
                })
            })
            console.log({file});
            return file
        })
        console.log({file});

        return file


    },
    update_lobbies(new_lobby_list) {
        lockFile.lock(lock_path, lockOptions, (err) => {
            fs.writeFile(`${__dirname}/lobby.json`, JSON.stringify(new_lobby_list), () => {
                lockFile.unlock(lock_path, () => {
                    return true
                })
            })
        })
    },
    join_lobby({ lobby_id, password, client, socket }) {
        const cur_lobby_list = this.get_lobby_list(true)
        console.log({cur_lobby_list});
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1 || cur_lobby_list[selected_lobby_index].started) return { status: false, msg: "لابی تکمیل است" }
        const { type, password: lobby_password, ban_list } = cur_lobby_list[selected_lobby_index]
        if (type === "private" && password !== lobby_password) return { status: false, msg: "کلمه عبور اشتباه است" }
        if (ban_list.includes(client.user_id)) return { status: false, msg: "شما اجازه ورود به این لابی را ندارید" }
        cur_lobby_list[selected_lobby_index].players.push(client)
        socket.to("lobby_list").emit("lobby_list", { lobby_list: cur_lobby_list })
        client.join(lobby_id)
        socket.to(lobby_id).emit("update_lobby_users", { lobby_users: cur_lobby_list[selected_lobby_index].players })
        this.update_lobbies(cur_lobby_list)
        const idenity = client.idenity
        idenity.lobby_id = lobby_id
        client.idenity = idenity
        return { status: true, msg: "", is_creator: cur_lobby_list[selected_lobby_index].creator === client.user_id, creator_id: cur_lobby_list[selected_lobby_index].creator }
    },
    kick_player({ lobby_id, player_to_kick, client, socket }) {
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1) return { status: false, msg: "لابی یافت نشد" }
        const { creator } = cur_lobby_list[selected_lobby_index]
        if (creator.user_id !== client.user_id) return { status: false, msg: "شما گرداننده این لابی نیستید" }
        let cur_players = structuredClone(cur_lobby_list[selected_lobby_index].players)
        cur_players = cur_players.filter(e => e.user_id !== player_to_kick)
        cur_lobby_list[selected_lobby_index].players = cur_players
        cur_lobby_list[selected_lobby_index].ban_list = player_to_kick
        this.update_lobbies(cur_lobby_list)
        socket.to("lobby_list").emit("lobby_list", { lobby_list: cur_lobby_list })
        socket.to(lobby_id).emit("update_lobby_users", { lobby_users: cur_lobby_list[selected_lobby_index].players })
        const kicked_player_socket = get_user_socket_id(player_to_kick)
        socket.to(kicked_player_socket).emit("kick_from_lobby")
        socket.sockets.sockets.get(kicked_player_socket)?.leave(lobby_id);
        return { status: true, msg: "بازیکن حذف شد" }
    },
    leave_lobby({ lobby_id, client, socket }) {
        if (!lobby_id) lobby_id = client.lobby_id
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1) return { status: false, msg: "لابی یافت نشد" }
        let cur_players = structuredClone(cur_lobby_list[selected_lobby_index].players)
        cur_players = cur_players.filter(e => e.user_id !== client.user_id)
        cur_lobby_list[selected_lobby_index].players = cur_players
        this.update_lobbies(cur_lobby_list)
        // socket.to("lobby_list").emit("lobby_list", { lobby_list: cur_lobby_list })
        socket.to(lobby_id).emit("update_lobby_users", { lobby_users: cur_lobby_list[selected_lobby_index].players })
        client.leave(lobby_id)
        const idenity = client.idenity
        idenity.lobby_id = null
        client.idenity = idenity
    },
    send_message_to_lobby({ client, lobby_id, msg, is_system_msg, socket }) {
        if (!lobby_id) lobby_id = client.idenity.lobby_id
        socket.to(lobby_id).emit("waiting_lobby_new_message", {
            sender: (is_system_msg || !client) ?
                {
                    avatar: client?.idenity.image,
                    name: "پیام سیستم",
                    is_system: true,
                    is_creator: client.idenity.lobby_creator === client.idenity.user_id,
                    user_id: "system"

                } :
                {
                    avatar: client.idenity.image,
                    name: client.idenity.name,
                    is_system: false,
                    is_creator: client.idenity.lobby_creator === client.idenity.user_id,
                    user_id: client.idenity.user_id

                },
            msg
        })
    },
    reset_list() {
        return
        fs.writeFile(`${__dirname}/lobby.json`, "[]", () => {
            console.log("clear");
        })
    }
}

module.exports = lobby