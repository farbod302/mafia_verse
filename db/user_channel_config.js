const mongoose = require("mongoose")



const userChannelConfig = mongoose.Schema({

    user_id: String,
    channel_id: String,
    notification_status: { type: Boolean, default: true },
    pin_status: { type: Boolean, default: true },
    last_visit: { type: Number, default: 0}
})



module.exports = mongoose.model("UserChannelConfig", userChannelConfig)