const mongoose = require("mongoose")



const channel = mongoose.Schema({

    name: String,
    id: String,
    avatar: {type:String,default:""},
    creator: String,
    users: { type: Array, default: [] },
    mods: { type: Array, default: [] },
    game_played: { type: Number, default: 0 },
    exp_level: { type: Number, default: 1 },
    join_req:{type:Array,default:[]}
})


module.exports = mongoose.model("Channel", channel)