const dinamic_vars = {
    time: "day",
    start:false,
    turn: -1,
    cur_event: " wait_to_join",
    next_event: "wait_to_join",
    queue: [],
    day: 1,
    dead_list: [],
    join_status: [],
    join_status_second_phase: [],
    game_go_live:false,
    w8: [],
    reval: false,
    vote_type: "pre_vote",
    speech_type: "introduction",
    can_take_challenge:false,
    custom_queue:[],
    votes_status:[],
    guns_status:[],
    defence_history:[],
    defence:[],
    report_data:{},
    nigth_reports:[],
    rols:[],
    comondo_true_shot:false,
    edit_event(op, event, value, from) {
        switch (op) {
            case ("edit"): {
                return this[event] = value == "plus" ? this[event] + 1 : value
            }
            case ("push"): {
                return this[event].push(value)
            }
            case ("pull"): {
                return this[event] = this[event].filter(e => e !== value)
            }
            case ("new_value"): {
                return this[event] = value
            }
        }
    },
    real_gun_used: false,
    doctor_self_save: false,
    nato_act: false,
    mafia_speak: false,
    comondo_gun_used:false,
    user_to_shot:null,
    users_gurd_check:[],
    inquiry_used:0
}
module.exports = dinamic_vars