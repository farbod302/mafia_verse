const befor_start = require("./before_start")
const Voice = require("../../../helper/live_kit_handler")
const reconnect = ({ game_vars, users, client, game_id }) => {
    const { user_id } = client
    const user_comp_data = befor_start.pick_player_from_user_id({ users, user_id })
    const { carts } = game_vars
    let user_character = carts.find(cart => cart.user_id === user_id)
    let live_kit_token = Voice.join_room(user_id, game_id)
    const { cur_event: game_event } = game_vars
    let game_action = [...game_vars.player_status]
    let in_game_turn_speech = []
    if (game_event === "speech") {
        in_game_turn_speech = [...game_vars.queue]
    }
    //todo check user gun
    return {
        character: user_character.name,
        user_data: user_comp_data,
        room_id: live_kit_token,
        game_event,
        game_action,
        in_game_turn_speech,
        in_game_status: {
            has_gun: false
        }

    }
}

module.exports = reconnect