const express = require("express")
const router = express.Router()
const Items = require("../db/item")



router.get("/items_list", async (req, res) => {
    const items = await Items.find()
    res.json({ items })
})


router.get("/last_items", async (req, res) => {
    const items = await Items.find().sort({ $natural: 1 }).limit(10)
    res.json({ items })

})

router.get("/same_items/:id", async (req, res) => {
    const { id } = req.params
    let selected_item = await Items.findById(id)
    const { categorys } = selected_item
    let same_items = await Items.find({ _id: { $ne: id }, categorys: { $in: categorys } }, { image: 1 })
    for (var i = same_items.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = same_items[i];
        same_items[i] = same_items[j];
        same_items[j] = temp;
    }
    res.json({ items: same_items.slice(0, 3) })
})
    


module.exports = router