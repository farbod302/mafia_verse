const mongoose = require("mongoose")



const channelToken = mongoose.Schema({

    token:String,
    user:String,
    used:{type:Boolean,default:false},
    used_for:{type:String,default:""}

})


module.exports = mongoose.model("ChannelToken", channelToken)