const mongoose = require("mongoose")



const user = mongoose.Schema({

    idenity: Object,
    avatar: Object,
    uid: String,
    age: { type: Number, default: 0 },
    own_channel: { type: Boolean, default: false },
    gold: Number,
    friend_limit: { type: Number, default: 20 },
    points: {
        type: Object,
        default: {
            win: 0,
            lose: 0,
            abdon: 0,
            com_report: 0,
            role_report: 0
        }
    },
    games_result: { type: Object, default: { game_as_mafia: 0, win_as_mafia: 0, game_as_citizen: 0, win_as_citizen: 0 } },
    session_games_result: {
        type: Object, default: {
            day: { win: 0, lose: 0 },
            week: { win: 0, lose: 0 },
            month: { win: 0, lose: 0 },
        }
    },
    ranking: { type: Object, default: { xp: 1, rank: 1500, medal: 0 } },
    session_rank: Object,
    achivments: { type: Array, default: [] },
    items: { type: Array, default: [] },
    friend_list: { type: Array, default: [] },
    friend_list_req: { type: Array, default: [] },
    following: { type: Array, default: [] },
    chanels: { type: Array, default: [] },
    cart: { type: Array, default: [] },
    reports: { type: Array, default: [] },
    status: { type: String, default: "gust" },
    representative: { type: String, default: "" },
    device_id: String,
    cur_game: { type: String, default: "" },
    notif_token: String,
    lucky_wheel_status: { type: Number, default: 0 },
    vip: { type: Boolean, default: false },
    vip_until: { type: Number, default: 0 },
    moderator: {
        type: Object,
        default: {
            cnt: 0,
            score: 0
        }
    }

})


module.exports = mongoose.model("User", user)