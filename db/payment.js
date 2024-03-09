const mongoose = require("mongoose")



const payment = mongoose.Schema({

    user_id: String,
    amount: Number,
    internal_id: String,
    payment_id: String,
    price: Number,
    date: Number,
    track_id: {
        type: String,
        default: ""
    },
    status: {
        type: Boolean,
        default: false
    },
    used: {
        type: Boolean,
        default: false
    },
    type: Boolean

})


module.exports = mongoose.model("Payment", payment)