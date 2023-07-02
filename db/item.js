const mongoose = require("mongoose")



const item = mongoose.Schema({

    name: String,
    price:Number,
    image:String,
    file:String,
    catrgorys:Array,
    type:String

})


module.exports = mongoose.model("Item", item)