const fs = require("fs")
const { uid } = require("uid")
var QRCode = require('qrcode')
const Helper = require("../../helper/helper")
const LocalGame = class {

    constructor(mod, player_count, socket, game_id, db) {
        this.mod = mod
        this.player_count = player_count
        this.deck = []
        this.socket = socket
        this.load_deck()
        this.start = false
        this.start_pick = false
        this.users = []
        this.turn = -1
        this.game_id = game_id
        const remove_game = () => {
            db.removeOne("local_game", "game_id", game_id)
        }
        this.remove_game = remove_game
    }

    load_deck() {
        const file = fs.readFileSync(`${__dirname}/clean_deck.json`)
        const deck = JSON.parse(file.toString())
        this.raw_deck = deck

    }

    game_handler(client, op, data) {
        switch (op) {

            case ("set_deck"): {
                const clean_deck = data.map(e => {
                    const { id } = e
                    const selected = this.raw_deck.find(e => e.id === id)
                    return selected
                })
                this.deck = clean_deck
                if (this.player_count !== data.length) return this.socket.to(client.id).emit("error", { data: { msg: "تعداد کارت با تعداد پلیر مقایرت دارد" } })
                QRCode.toDataURL("http://192.168.43.161:3000/local_game?game_id=" + this.game_id, (err, url) => {
                    this.socket.to(client.id).emit("local_game_started", { data: { qr_code: url } })
                    this.start = true
                })

                break
            }

            case ("join_local_game"): {
                if (this.users.length === this.player_count) return this.socket.to(client.id).emit("error", { data: { msg: "ظرفیت تکمیل است" } })
                const { name } = data
                client.join(this.game_id)
                const user_id = uid(3)
                this.socket.to(client.id).emit("prv_deck", { data: { deck: this.deck } })
                client.local_game_data = { user_id, game_id: this.game_id, name }
                this.users.push({
                    cart: null,
                    user_id,
                    name,
                    socket_id: client.id
                })
                const { socket_id } = this.mod
                this.socket.to(socket_id).emit("users_join", { data: { users: this.users, can_start: this.player_count === this.users.length } })
                break
            }
            case ("leave_local_game"): {
                const { user_id } = client.local_game_data
                this.users_leave(user_id)
            }

            case ("pick_cart"): {
                if (this.users.length !== this.player_count) return this.socket.to(client.id).emit("error", { data: { msg: "تعدادی از بازیکنان هنوز به بازی متصل نشده اند" } })
                this.start_pick_cart()
                break
            }


            case ("get_deck"): {
                const { socket_id } = this.mod
                const { raw_deck } = this
                this.socket.to(socket_id).emit("get_deck", { data: raw_deck })
            }
        }
    }

    pick({ index, local_game_data }) {
        const { user_id, name } = local_game_data
        const selected_cart = this.shuffled_carts[index]
        const user_index = this.users.findIndex(e => e.user_id === user_id)
        this.users[user_index].cart = selected_cart.name
        this.shuffled_carts[index].user_pick = name
        const s_user = this.users.find(e => e.user_id === user_id)
        const { socket_id: user_socket_id } = s_user
        this.socket.to(user_socket_id).emit("cart", { data: selected_cart })
        const { socket_id } = this.mod
        this.socket.to(socket_id).emit("users", { data: { users: this.users } })
        this.next_player_pick_cart()
    }

    users_leave(user_id) {
        let prv_users = [...this.users]
        prv_users = prv_users.filter(e => e.user_id !== user_id)
        this.users = prv_users
        const { socket_id } = this.mod
        this.socket.to(socket_id).emit("users_join", { data: { users: this.users, can_start: this.player_count === this.users.length } })
    }


    shuffle_carts() {
        let carts = [...this.deck]
        for (var i = carts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = carts[i];
            carts[i] = carts[j];
            carts[j] = temp;
        }
        return carts.map(e => { return { ...e, user_pick: null } })
    }


    start_pick_cart() {
        const shuffled_carts = this.shuffle_carts()
        this.shuffled_carts = shuffled_carts
        const { game_id } = this
        this.socket.to(game_id).emit("shuffled_carts", { data: { carts: shuffled_carts } })
        const { socket_id } = this.mod
        this.socket.to(socket_id).emit("pick_started", { data: { users: this.users } })
        this.next_player_pick_cart()
    }

    async next_player_pick_cart() {
        this.turn = this.turn + 1
        const { turn } = this
        if (turn === this.player_count) {
            return this.remove_game()
        }
        const s_user = this.users[turn]
        const { socket_id } = s_user
        this.socket.to(socket_id).emit("pick_cart")
        const cur = +`${this.turn}`
        const jump_to_next = (cur_index) => {
            if (cur_index === this.turn) {
                const first_empty_slot = this.shuffled_carts.findIndex(e => !e.user_pick)
                const { user_id, name } = this.users[cur_index]
                this.pick({
                    index: first_empty_slot,
                    local_game_data: {
                        user_id, name
                    }
                })
            }
        }
        await Helper.delay(0.5)
        jump_to_next(cur)


    }


}

module.exports = LocalGame