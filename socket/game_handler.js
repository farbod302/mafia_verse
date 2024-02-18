const Game = require("../games/tv/game")
const data_handler = require("../games_temp_data/data_handler")
const online_users_handler = require("./online_users_handler")

const game_handler = {
    create_game({ game_id, db, socket, mod }) {
        let selected_game_to_start = db.getOne("games_queue", "game_id", game_id)
        if (!selected_game_to_start) return
        const { users, senario } = selected_game_to_start
        let new_game = {
            mod,
            senario,
            users,
            modrators: [],
            game_id,
        }
        const game_handlers = {
            abandon_game: (socket) => { game_handler.abandon_game({ game_id, socket, db }) },
            submit_player_abandon: ({ user_id }) => {
                db.removeOne("disconnect", "user_id", user_id)
            },
            submit_finish_game(game_id) {

                db.removeOne("disconnect", "game_id", game_id)
                setTimeout(() => {
                    db.removeOne("games", "game_id", game_id)
                }, 1000 * 60 * 2)
            }

        }
        let game = new Game({
            users,
            socket,
            game_id,
            game_handlers,
            mod
        })
        db.add_data("games", { ...new_game, game_class: game })
        data_handler.create_game(game_id)
        users.forEach(user => {
            try {
                let user_socket = online_users_handler.get_user_socket_id(user.user_id)
                console.log({user_socket});
                socket.sockets.sockets.get(user_socket).join(game_id);
                socket.to(user_socket).emit("game_found", { data: { game_id, is_creator: false } })
            }
            catch(err) {
                console.log("find match error",err);
                return
            }
        })
        if (mod) {
            let mod_socket = online_users_handler.get_user_socket_id(mod)
            socket.sockets.sockets.get(mod_socket).join(game_id);
            socket.to(mod_socket).emit("game_found", { data: { game_id, is_creator: true } })
        }


        db.removeOne("games_queue", "game_id", game_id)


    },

    abandon_game({ game_id, socket, db }) {
        socket.to(game_id).emit("abandon")
        db.removeOne("games", "game_id", game_id)
    }
}


module.exports = game_handler