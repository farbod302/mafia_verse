const Game = require("../games/tv/game")
const online_users_handler = require("./online_users_handler")

const game_handler = {
    create_game({ game_id, db, socket, mod }) {
        console.log({mod},"form create game");
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
        for (let party of partys) {
            socket.to(party).emit("game_found", { game_id })
        }
        users.forEach(user => {
            console.log({ game_id });
            socket.sockets.sockets.get(online_users_handler.get_user_socket_id(user.user_id)).join(game_id);
        })
        db.removeOne("games_queue", "game_id", game_id)


    },

    abandon_game({ game_id, socket, db }) {
        console.log("im run");
        socket.to(game_id).emit("abandon")
        db.removeOne("game", "game_id", game_id)
    }
}


module.exports = game_handler