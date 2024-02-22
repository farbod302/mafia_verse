const Helper = require("../../../helper/helper")
const { delay } = require("../../../helper/helper")
const run_timer = require("../../../helper/timer")
const befor_start = require("./before_start")
const _play_voice = require("./play_voice")
const start = require("./start")

const vote = {
    async start_vote({ game_vars }) {

        await delay(3)
        game_vars.edit_event("edit", "votes_status", [])
        const { defenders_queue, vote_type, custom_queue } = game_vars
        let custom = defenders_queue?.length ? defenders_queue : custom_queue
        let users_to_vote = vote_type !== "pre_vote" ? custom : start.pick_live_users({ game_vars })
        game_vars.edit_event("edit", "queue", users_to_vote)
        game_vars.edit_event("edit", "turn", -1)
        game_vars.edit_event("edit", "next_event", "next_player_vote_time")

    },
    async next_player_vote_turn({ game_vars, socket, game_id, cycle, users, play_voice }) {
        const { queue, turn, vote_type, custom_queue } = game_vars
        let new_vote_record = { user_id: queue[turn].user_id, available_users: [], users: [], vote_type, timer: 5 }
        game_vars.edit_event("push", "votes_status", new_vote_record)
        // socket.to(game_id).emit("vote", { data: new_vote_record })
        // vote to player
        let cur_player = queue[turn]

        if (turn !== 0) {
            start.edit_game_action({
                index: users.findIndex(e => e.user_id === queue[turn - 1].user_id),
                prime_event: "user_status",
                second_event: "on_vote",
                new_value: false,
                game_vars: game_vars
            })
        }
        if (queue[turn].user_id) {
            start.edit_game_action({
                index: users.findIndex(e => e.user_id === queue[turn].user_id),
                prime_event: "user_status",
                second_event: "on_vote",
                new_value: true,
                game_vars: game_vars
            })
        }
        let { player_status } = game_vars
        socket.to(game_id).emit("game_action", { data: turn === 0 ? [player_status[0]] : [player_status[turn - 1], player_status[turn]] })


        const index = users.findIndex(e => e.user_id === cur_player.user_id)
        let dead_users = game_vars.player_status.filter(e => !e.user_status.is_alive)
        dead_users = dead_users.map(e => e.user_id)
        let users_to_prevent_vote = dead_users.concat(cur_player.user_id)
        console.log({custom_queue});
        if (custom_queue.length && custom_queue.length < 3) {
            custom_queue.forEach(user => {
                console.log(user.user_id,"PREVENT");
                users_to_prevent_vote.push(user.user_id)
            })
        }
        let user_to_vote = users.filter(user => !users_to_prevent_vote.includes(user.user_id))
        new_vote_record.available_users = user_to_vote.map(e => e.user_id)
        if (index > -1) {
            socket.to(game_id).emit("report", {
                data: {
                    msg: `رای ${vote_type === "defence" ? "خروج" : "گیری"} برای بازیکن شماره ${index + 1}`, timer: 3
                }
            })
            play_voice(_play_voice.play_voice(`${vote_type === "defence" ? "exit_" : ""}vote_to`, index))
        } else {
            const remain_inq = 2 - game_vars.inquiry_used
            socket.to(game_id).emit("report", {
                data: {
                    msg: `استعلام باقی مانده:${remain_inq} آیا شهر استعلام می خواد؟`, timer: 3
                }
            })
            play_voice(_play_voice.play_voice("need_inquiry"))

        }
        await Helper.delay(3)
        user_to_vote.forEach(user => {
            socket.to(user.socket_id).emit("vote", { data: new_vote_record, timer: 3 })
        })
        run_timer(6, cycle)
    },
    submit_vote({ client, socket, game_vars, game_id }) {
        const { votes_status } = game_vars
        let turn = votes_status.length - 1
        let new_vote_status = [...votes_status]
        new_vote_status[turn].users.push(client.idenity.user_id)
        game_vars.edit_event("edit", "votes_status", new_vote_status)
        // socket.to(game_id).emit("vote", { data: new_vote_status[turn] })
    },

    // A1V4Nymz9ovZ91iM8O


    async arange_defence({ game_vars, users, socket, game_id }) {
        const { votes_status } = game_vars
        const live_users = start.pick_live_users({ game_vars })
        const live_users_count = live_users.length
        let users_to_defence = votes_status.filter(user => user.users.length >= Math.floor(live_users_count / 2))
        let defender_ids = users_to_defence.map(user => user.user_id)
        let defenders_queue = users.filter(user => defender_ids.includes(user.user_id))
        game_vars.edit_event("edit", "defenders_queue", defenders_queue)
        if (defenders_queue.length) {


            const defender_index = defenders_queue.map(e => {
                const index = users.findIndex(s => s.user_id === e.user_id)
                return index + 1
            })


            socket.to(game_id).emit("report", {
                data: {
                    msg: `${defender_index.length === 1 ? "بازیکن" : "بازیکنان"} ${defender_index.join(" و ")} به دفاعیه ${defenders_queue.length === 1 ? "میره" : "میرن"}`, timer: 4
                }
            })

            await Helper.delay(5)
            defenders_queue.forEach(user => game_vars.edit_event("push", "defence_history", user.user_id))
            game_vars.edit_event("edit", "can_take_challenge", false)
            game_vars.edit_event("edit", "turn", -1)
            game_vars.edit_event("edit", "cur_event", "defence")
            game_vars.edit_event("edit", "vote_type", "defence")
            game_vars.edit_event("edit", "speech_type", "defence")
            socket.to(game_id).emit("game_event", { data: { game_event: "none" } })
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


    arrange_queue_after_target_cover({ game_vars, users }) {

        const { target_cover_queue } = game_vars
        let speech_queue = []
        target_cover_queue.forEach((user) => {
            const { users_select, users_select_length, user_id } = user
            speech_queue.push(user_id)
            if (users_select.length === users_select_length) {
                speech_queue = speech_queue.concat(users_select)
            }
        })
        speech_queue = speech_queue.map(user_id => {
            let user = befor_start.pick_player_from_user_id({ users, user_id })
            return user
        })
        game_vars.edit_event("edit", "custom_queue", speech_queue.reverse())
        game_vars.edit_event("edit", "next_event", "start_speech")

    },

    count_exit_vote({ game_vars, users, socket, game_id, socket_finder, play_voice }) {
        const { votes_status } = game_vars
        let user_to_exit = votes_status.sort((a, b) => { return b.users.length - a.users.length })
        console.log({ user_to_exit });
        user_to_exit = user_to_exit[0]
        let exit_vote_count = user_to_exit.users.length
        console.log({ exit_vote_count });
        const live_users = start.pick_live_users({ game_vars })
        const live_users_count = live_users.length
        if (exit_vote_count < Math.floor(live_users_count / 2)) return
        //todo count exit vote
        let users_with_same_vote = votes_status.filter(user => user.users.length === exit_vote_count)
        console.log({ users_with_same_vote });
        user_to_exit = null
        if (users_with_same_vote.length === 1) {
            user_to_exit = users_with_same_vote[0]
        }
        // else {
        //     let { defence_history } = game_vars
        //     let users_with_def_history = users_with_same_vote.filter(user => {
        //         return defence_history.includes(user.user_id)
        //     })
        //     if (!users_with_def_history.length) return
        //     if (users_with_def_history.length === 1) user_to_exit = users_with_def_history[0]
        //     if (users_with_def_history.length > 1) {
        //         let rand = Math.floor(Math.random() * users_with_def_history.length)
        //         user_to_exit = users_with_def_history[rand]
        //     }

        // }
        if (user_to_exit) {
            const { user_id } = user_to_exit
            //check if guard
            const { carts, dead_list } = game_vars
            let guard = carts.findIndex(cart => cart.name === "guard")
            if (guard !== -1 && carts[guard]?.user_id === user_id) {
                let new_carts = [...carts]
                new_carts[guard].name = "citizen"
                game_vars.edit_event("edit", "carts", new_carts)
                const index = users.findIndex(e => e.user_id === user_id)
                const socket_id = socket_finder(user_id)
                socket.to(socket_id).emit("player_show_character")
                game_vars.edit_event("edit", "report_data",
                    {
                        user_id: user_id,
                        event: "exit_vote",
                        msg: `از بازی کسی خارج نشد.بازیکن شماره ${index + 1} با نقش شهروندی به بازی ادامه خواهد داد و قابل ناتویی نیست.`
                    })

                // play_voice(_play_voice.play_voice("moved_out", index))

            } else {
                let index = game_vars.player_status.findIndex(user => user.user_id === user_id)
                start.edit_game_action({
                    index,
                    prime_event: "user_status",
                    second_event: "is_alive",
                    new_value: false,
                    game_vars
                })
                if (!dead_list.includes(user_id)) {
                    game_vars.edit_event("push", "dead_list", user_id)
                }

                const { player_status } = game_vars
                socket.to(game_id).emit("game_action", { data: [player_status[index]] })

                game_vars.edit_event("edit", "report_data",
                    {
                        user_id: user_id,
                        event: "exit_vote",
                        msg: `بازیکن شماره ${index + 1} از بازی خارج شد`
                    })
            }
            start.generate_report({
                game_vars,
                report_type: "vote_report",
                socket,
                game_id
            })

        }
        game_vars.edit_event("edit", "vote_type", "pre_vote")
        game_vars.edit_event("edit", "custom_queue", [])
        return user_to_exit?.user_id || null


    },




}

module.exports = vote