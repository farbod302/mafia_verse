const mongoose = require("mongoose")



const pay = mongoose.Schema({

    user_id: String,
    amount: Number,
    internal_id: String,
    payment_id: String,
    price:Number,
    date: Number,
    status: {
        type: Boolean,
        default: false
    },
    used: {
        type: Boolean,
        default: false
    }

})


module.exports = mongoose.model("Pay", pay)