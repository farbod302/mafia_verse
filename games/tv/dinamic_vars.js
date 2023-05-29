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
    w8: [],
    reval: false,
    vote_type: "pre_vote",
    speech_type: "introduction",
    can_take_challenge:false,
    custom_queue:[],
    votes_status:[],
    rols:[],
    report_data:{},
    nigth_reports:[],
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
    pick_event(event){
        return this[event]
    }
}
module.exports = dinamic_vars