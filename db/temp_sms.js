const mongoose = require("mongoose")



const temp = mongoose.Schema({

    name: String,
    userName: String,
    code: String,
    phone: String,
    device_id: String,
    used: { type: Boolean, default: false }

})


module.exports = mongoose.model("TempSms", temp)