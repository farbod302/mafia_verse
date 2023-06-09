const { delay } = require("../../../helper/helper")
const run_timer = require("../../../helper/timer")
const befor_start = require("./before_start")
const start = require("./start")
const targetCover = require("./target_cover")

const vote = {
    async start_vote({ game_vars }) {

        await delay(3)
        game_vars.edit_event("edit", "vote_status", [])
        const { custom_queue, vote_type } = game_vars
        let users_to_vote = vote_type !== "pre_vote" ? custom_queue : start.pick_live_users({ game_vars })
        game_vars.edit_event("edit", "queue", users_to_vote)
        game_vars.edit_event("edit", "turn", -1)
        game_vars.edit_event("edit", "next_event", "next_player_vote_time")

    },
    next_player_vote_turn({ game_vars, socket, game_id, cycle, users }) {
        console.log("VOTE ADD");
        const { queue, turn, vote_type, custom_queue } = game_vars
        let new_vote_record = { user_id: queue[turn].user_id, users: [], vote_type }
        game_vars.edit_event("push", "votes_status", new_vote_record)
        socket.to(game_id).emit("vote", { data: new_vote_record, timer: 5 })
        // vote to player
        let cur_player = queue[turn]
        let users_to_prevent_vote = [cur_player.user_id]
        if (custom_queue.length && custom_queue.length < 3) {
            custom_queue.forEach(user => users_to_prevent_vote.push(user.user_id))
        }
        let user_to_vote = users.filter(user => !users_to_prevent_vote.includes(user.user_id))
        user_to_vote.forEach(user => socket.to(user.socket_id).emit("vote_to_player", { data: { user: cur_player } }))
        run_timer(10, cycle)
    },
    submit_vote({ client, socket, game_vars, game_id }) {
        console.log(`vote submited from ${client.idenity.user_id}`);
        const { votes_status } = game_vars
        console.log({ votes_status });
        let turn = votes_status.length - 1
        console.log({ turn });
        let new_vote_status = [...votes_status]
        new_vote_status[turn].users.push(client.idenity.user_id)
        game_vars.edit_event("edit", "votes_status", new_vote_status)
        socket.to(game_id).emit("vote", { data: new_vote_status[turn] })
        console.log({ votes_status });
    },


    arange_defence({ game_vars, users }) {
        const { votes_status } = game_vars
        //todo : count users
        let users_to_defence = votes_status.filter(user => user.users.length)
        let defender_ids = users_to_defence.map(user => user.user_id)
        let defenders_queue = users.filter(user => defender_ids.includes(user.user_id))
        if (defenders_queue.length) {
            defenders_queue.forEach(user => game_vars.edit_event("push", "defence_history", user.user_id))
            game_vars.edit_event("edit", "can_take_challenge", false)
            game_vars.edit_event("edit", "turn", -1)
            game_vars.edit_event("edit", "cur_event", "defence")
            game_vars.edit_event("edit", "vote_type", "defence")
            if (defenders_queue.length >= 3) {
                game_vars.edit_event("edit", "custom_queue", defenders_queue)
                game_vars.edit_event("edit", "next_event", "start_speech")
                return
            }
            else {
                game_vars.edit_event("edit", "queue", defenders_queue)
                game_vars.edit_event("edit", "next_event", "enable_target_cover")
                game_vars.edit_event("edit", "turn", -1)

            }


        }
        else {
            game_vars.edit_event("edit", "next_event", "start_night")

        }

    },

  
    count_exit_vote({ game_vars, users, socket, game_id }) {
        const { votes_status } = game_vars
        let user_to_exit = votes_status.sort((a, b) => { b.users.length - a.users.length })
        console.log({ user_to_exit });
        user_to_exit = user_to_exit[0]
        let exit_vote_count = user_to_exit.users.length
        if (exit_vote_count === 0) return
        //todo count exit vote
        let users_with_same_vote = votes_status.filter(user => user.users.length === exit_vote_count)
        user_to_exit = null
        if (users_with_same_vote.length === 1) {
            user_to_exit = users_with_same_vote[0]
            console.log({ user_to_exit });
        }
        else {
            let { defence_history } = game_vars
            let users_with_def_history = users_with_same_vote.filter(user => {
                return defence_history.includes(user.user_id)
            })
            if (!users_with_def_history.length) return
            if (users_with_def_history.length === 1) user_to_exit = users_with_def_history[0]
            if (users_with_def_history.length > 1) {
                let rand = Math.floor(Math.random() * users_with_def_history.length)
                user_to_exit = users_with_def_history[rand]
            }

        }
        if (user_to_exit) {
            const { user_id } = user_to_exit
            //check if guard
            const { carts } = game_vars
            let guard = carts.findIndex(cart => cart.name === "guard")
            if (carts[guard].user_id === user_id) {
                let new_carts = [...carts]
                new_carts[guard].name === "citizen"
                game_vars.edit_event("edit", "carts", new_carts)
                let comp_user = befor_start.pick_player_from_user_id({ users, user_id })
                game_vars.edit_event("edit", "report_data",
                    {
                        user: user_id,
                        event: "exit_vote",
                        msg: `از بازی کسی خارج نشد.بازیکن شماره ${comp_user.index} با نقش شهروندی به بازی ادامه خواهد داد و قابل ناتوئی نیست.`
                    })
            } else {
                let index = users.findIndex(user => user.user_id === user_id)
                start.edit_game_action({
                    index,
                    prime_event: "user_status",
                    second_event: "is_aliave",
                    new_value: false,
                    game_vars
                })
                game_vars.edit_event("push", "dead_list", user_id)
                game_vars.edit_event("edit", "report_data",
                    {
                        user: user_id,
                        event: "exit_vote",
                        msg: "از بازی یک نفر با رای بازیکنان خارج شد "
                    })
                start.generate_report({
                    game_vars,
                    report_type: "vote_report",
                    socket,
                    game_id
                })
            }

        }
        game_vars.edit_event("edit", "vote_type", "pre_vote")
        game_vars.edit_event("edit", "custom_queue", [])
        return user_to_exit?.user_id || null


    },




}

module.exports = vote