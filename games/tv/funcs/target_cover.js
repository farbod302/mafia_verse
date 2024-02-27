const targetCover = {
    enable_target_cover({ game_vars }) {
        const { queue } = game_vars
        let target_cover_queue = []
        if (queue.length === 1) target_cover_queue = [
            { user_id: queue[0].user_id, type: "target_cover", users_select: [], users_select_length: 2, permission: null, comp: false }
        ]
        else {
            target_cover_queue = queue.map(user => {
                return { user_id: user.user_id, type: "about", users_select: [], users_select_length: 1, permission: null, comp: false }
            })
        }
        const ids=queue.map(e=>e.user_id)
        game_vars.edit_event("edit", "target_cover_queue", target_cover_queue)
        game_vars.edit_event("edit", "target_cover_disable", ids)
    },

    next_target_cover({ game_vars, users }) {
        game_vars.edit_event("edit", "turn", "plus")
        const { target_cover_queue, turn } = game_vars
        if (turn === target_cover_queue.length) {
        }


    }
}

module.exports = targetCover