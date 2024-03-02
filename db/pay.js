const mongoose = require("mongoose")



const pay = mongoose.Schema({

    user: String,
    gold_amount: Number,
    price: Number,
    used: { type: Boolean, default: false },
    payment_local_id: String,
    payment_api_id: String,
    status: { type: Boolean, default: false },
    track_id: { type: String, default: "" },
    pay_from:String,
    date:Number

})


module.exports = mongoose.model("Pay", pay)