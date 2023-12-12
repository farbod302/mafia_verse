const dinamic_vars = class {
    constructor() {
        this.is_end = false
        this.time = "day"
        this.start = false
        this.turn = -1
        this.cur_event = " wait_to_join"
        this.next_event = "wait_to_join"
        this.queue = []
        this.day = 1
        this.is_live = false
        this.reconnect_queue = []
        this.abandon_queue = []
        this.dead_list = []
        this.join_status = []
        this.join_status_second_phase = []
        this.game_go_live = false
        this.w8 = []
        this.dc_queue=[]
        this.reval = false
        this.vote_type = "pre_vote"
        this.speech_type = "introduction"
        this.can_take_challenge = false
        this.custom_queue = []
        this.votes_status = []
        this.gun_status = []
        this.defence_history = []
        this.defenders = []
        this.report_data = {}
        this.nigth_reports = []
        this.rols = []
        this.target_cover_queue = []
        this.comondo_true_shot = false
        this.real_gun_used = false
        this.doctor_self_save = false
        this.nato_act = false
        this.mafia_speak = false
        this.comondo_gun_used = false
        this.user_to_shot = null
        this.users_gurd_check = []
        this.inquiry_used = 0
        this.users_detective_check = []
        this.chaos_vots = []
        this.chaos_run_count = 0
        this.player_reval = null
        this.winner = null
        this.second_chance = []
        this.mafia_need_token=[]
        this.challenge_time_status=[]
    }
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
    }

}
module.exports = dinamic_vars