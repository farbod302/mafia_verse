const mongoose = require("mongoose")



const itemTransaction = mongoose.Schema({

    user_id: String,
    date: Number,
    item_id: String,
    gold: Number,
    note:String,
    device:String

})



module.exports = mongoose.model("ItemTransaction", itemTransaction)