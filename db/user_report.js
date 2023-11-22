const mongoose = require("mongoose")



const userReport = mongoose.Schema({

    user_id:String,
    date: Number,
    msg:Array,
})


module.exports = mongoose.model("UserReport", userReport)