const mongoose = require("mongoose")



const report = mongoose.Schema({

    report_type: String,
    user_reported: String,
    user_submitted: String,
    game_id: String,
    date:Number

})


module.exports = mongoose.model("Report", report)