const Voice = require("../../../helper/live_kit_handler")
const reconnect = ({ game_vars, users, client, game_id }) => {
    const { user_id } = client
    const user_comp_data = users
    const { carts } = game_vars
    let user_character = carts.find(cart => cart.user_id === user_id)
    let live_kit_token = Voice.join_room(user_id, game_id)
    const { cur_event: game_event } = game_vars
    let game_action = [...game_vars.player_status]
    let in_game_turn_speech = []
    if (game_event === "start_speech" || game_event === "next_player_speech") {
        in_game_turn_speech = [...game_vars.queue]
    }
    let clean_users=user_comp_data.map(e=>{return {...e,user_name:"",index:e.id,user_anim:""}})
    //todo check user gun
    return {
        character: user_character.name,
        users_data: clean_users,
        room_id: live_kit_token,
        game_event:game_event_finder(game_event),
        game_action,
        in_game_turn_speech,
        in_game_status: {
            has_gun: false
        }

    }
}


const game_event_finder = (event) => {
    const all_events = [
        
        {
            e: "vote",
            events: ["next_player_vote"]
        },
        {
            e: "night",
            events: ["pre_vote", "check_for_inquiry", "next_player_vote_time",
                "guard_and_hostage_taker_act", "mafia_speech", "check_mafia_decision",
                "mafia_shot", "use_nato", "other_acts",
            ]
        },
        {
            e: "chaos",
            events: [
                "chaos", "chaos_speech_second_phase", "chaos_result_first_phase", "next_player_chaos_vote",
                "chaos_result_second_phase",
            ]
        }
    ]

    let s_event=all_events.find(ev=>{
        if(ev.events.includes(event))return true
    })
    return s_event?.e || "day"
}

module.exports = reconnect