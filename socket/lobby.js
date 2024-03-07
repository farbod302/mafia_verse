const { uid } = require("uid")
const fs = require("fs")
const { get_user_socket_id } = require("./online_users_handler");
const Helper = require("../helper/helper");
const lobby = {

    update_list: [],
    is_running: false,
    async run_cycle() {
        console.log("run");
        if (this.is_running) return console.log("running");
        if (!this.update_list.length) return console.log("no task");
        this.is_running = true
        this.update_list[0].then(() => {
            this.update_list.shift()
            this.is_running = false
            console.log("don");
            this.run_cycle()
        })
    },
    async create_lobby(client, data, socket) {
        const { name, scenario, player_cnt, characters, cards, private, password } = data

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
        }
        const lobby_list = await this.add_lobby_to_json(new_lobby)
        socket.to("lobby_list").emit("lobby_list", { lobby_list })
        client.join(lobby_id)
        return lobby_id


    },
    async add_lobby_to_json(lobby) {
        const cur_file_json = await this.get_lobby_list(true)
        console.log({ cur_file_json });
        const new_file = cur_file_json.concat(lobby)
        this.update_lobbies(new_file)
        return new_file.map(e => {
            delete e.password
            return e
        })
    },
    async read_file() {
        if (this.is_running) {
            await Helper.delay(1)
            this.read_file()
        }
        return fs.readFileSync(`${__dirname}/lobby.json`)
    },
    async get_lobby_list(keep_pass) {
        const cur_file_raw = await this.read_file()
        const cur_file_json = JSON.parse(cur_file_raw.toString())
        if (keep_pass) return cur_file_json
        return cur_file_json.map(e => {
            delete e.password
            return e
        })
    },
    async update_lobbies(new_lobby_list) {
        const promises = new Promise(resolve => {
            fs.writeFile(`${__dirname}/lobby.json`, JSON.stringify(new_lobby_list), () => {
                resolve()
            })
        })
        this.update_list.push(promises)
        this.run_cycle()
    },
    join_lobby({ lobby_id, password, client, socket }) {
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1 || cur_lobby_list[selected_lobby_index].started) return { status: false, msg: "لابی تکمیل است" }
        const { private, password: lobby_password, ban_list } = cur_lobby_list[selected_lobby_index]
        if (private && password !== lobby_password) return { status: false, msg: "کلمه عبور اشتباه است" }
        if (ban_list.includes(client.user_id)) return { status: false, msg: "شما اجازه ورود به این لابی را ندارید" }
        cur_lobby_list[selected_lobby_index].players.push(client)
        socket.to("lobby_list").emit("lobby_list", { lobby_list: cur_lobby_list })
        client.join(lobby_id)
        socket.to(lobby_id).emit("update_lobby_users", { lobby_users: cur_lobby_list[selected_lobby_index].players })
        this.update_lobbies(cur_lobby_list)
        const idenity = client.idenity
        idenity.lobby_id = lobby_id
        client.idenity = idenity
        return { status: true, msg: "", is_creator: cur_lobby_list[selected_lobby_index].creator === client.user_id }
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
        if (!lobby_id) lobby_id = client.lobby_id
        const cur_lobby_list = this.get_lobby_list(true)
        const selected_lobby_index = cur_lobby_list.findIndex(e => e.lobby_id === lobby_id)
        if (selected_lobby_index === -1) return { status: false, msg: "لابی یافت نشد" }
        let cur_messages = structuredClone(cur_lobby_list[selected_lobby_index].messages)
        cur_messages.push({
            sender: (is_system_msg || !client) ? { avatar: "", name: "پیام سیستم" } : { avatar: client.image, name: client.name },
            msg
        })
        cur_lobby_list[selected_lobby_index].messages = cur_messages
        this.update_lobbies(cur_lobby_list)
        socket.to(lobby_id).emit("new_message", {
            sender: (is_system_msg || !client) ? { avatar: "", name: "پیام سیستم" } : { avatar: client.image, name: client.name },
            msg
        })
    },
    reset_list() {
        fs.writeFileSync(`${__dirname}/lobby.json`, "[]")
    }


}

module.exports = lobby