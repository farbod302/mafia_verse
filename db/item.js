const mongoose = require("mongoose")



const item = mongoose.Schema({

    id:String,
    name: String,
    price:Number,
    image:String,
    file:String,
    categorys:Array,
    type:String,
    rel_items:Array,
    active:Boolean

})


module.exports = mongoose.model("Item", item)