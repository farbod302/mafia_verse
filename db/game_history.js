const mongoose = require("mongoose")



const gameHistory = mongoose.Schema({

    game_id:String,
    winner: String,
    users:Array,
    game_info:Array
    

})


module.exports = mongoose.model("GameHistory", gameHistory)