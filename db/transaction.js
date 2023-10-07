const mongoose = require("mongoose")



const transaction = mongoose.Schema({

    user_id:String,
    date:Number,
    plan:String,
    token:String,
    price:String,
    gold:Number,
    success:Boolean
   
})



module.exports = mongoose.model("Transaction", transaction)