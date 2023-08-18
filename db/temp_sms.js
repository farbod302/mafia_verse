const mongoose = require("mongoose")



const temp = mongoose.Schema({

    name: String,
    code: String,
    phone: String,
    device_id: String,
    used: { type: Boolean, default: false },
    notif_token:String

})


module.exports = mongoose.model("TempSms", temp)