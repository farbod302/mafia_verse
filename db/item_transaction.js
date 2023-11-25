const mongoose = require("mongoose")



const itemTransaction = mongoose.Schema({

    user_id: String,
    date: Number,
    item_id: String,
    gold: Number

})



module.exports = mongoose.model("ItemTransaction", itemTransaction)