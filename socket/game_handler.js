const Game = require("../games/tv/game")
const online_users_handler = require("./online_users_handler")

const game_handler = {
    create_game({ game_id, db, socket, mod }) {
        console.log({ mod }, "form create game");
        let selected_game_to_start = db.getOne("games_queue", "game_id", game_id)
        if (!selected_game_to_start) return
        const { users, partys, senario } = selected_game_to_start
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
                console.log({ user_id }, "for abandon");
                console.log(db.getAll("disconnect"), "befor");
                db.removeOne("disconnect", "user_id", user_id)
                console.log(db.getAll("disconnect"), "after");
            },
            submit_finish_game(game_id) {
                console.log({ game_iddddddddddddddddd: game_id });
                db.removeOne("games", "game_id", game_id)
                console.log({after_remove:db.getAll("games")});
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

        users.forEach(user => {
            let user_socket = online_users_handler.get_user_socket_id(user.user_id)
            socket.sockets.sockets.get(user_socket).join(game_id);
            socket.to(user_socket).emit("game_found", { data: { game_id, is_creator: false } })
        })
        if (mod) {
            let mod_socket = online_users_handler.get_user_socket_id(mod)
            socket.sockets.sockets.get(mod_socket).join(game_id);
            socket.to(mod_socket).emit("game_found", { data: { game_id, is_creator: true } })
        }


        db.removeOne("games_queue", "game_id", game_id)


    },

    abandon_game({ game_id, socket, db }) {
        console.log("im run");
        socket.to(game_id).emit("abandon")
        db.removeOne("game", "game_id", game_id)
    }
}


module.exports = game_handler