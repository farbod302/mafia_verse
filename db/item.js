const mongoose = require("mongoose")



const item = mongoose.Schema({

    id: String,
    name: String,
    price: Number,
    image: String,
    file: String,
    categorys: Array,
    type: String,
    rel_items: Array,
    active: Boolean,
    off: { type: Number, default: 0 }

})


module.exports = mongoose.model("Item", item)