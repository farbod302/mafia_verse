const mongoose = require("mongoose")



const report = mongoose.Schema({

    kind: String,
    report_id: String,
    user_submitted: String,
    game_id: String,
    date:Number

})


module.exports = mongoose.model("Report", report)