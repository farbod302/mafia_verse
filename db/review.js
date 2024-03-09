const mongoose = require("mongoose")



const review = mongoose.Schema({

    review_id: String,
    user_id: String,
    image: String,
    status: String,
    date:Number

})


module.exports = mongoose.model("Review", review)