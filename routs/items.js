const express = require("express")
const router = express.Router()
const Items = require("../db/item")
const User = require("../db/user")
const reject = require("../helper/reject_handler")



router.get("/items_list", async (req, res) => {
    const items = await Items.find({ active: true })
    res.json({ items })
})


router.post("/items_list", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(0, res)
    const items = await Items.find({ active: true })
    let s_user = await User.findOne({ uid: user.uid })
    const { items: user_items } = s_user
    let items_to_res = items.map(item => {
        return {
            ...item,
            active_for_user: !user_items.includes(item._id)
        }
    })

    res.json({
        status: true,
        msg: "",
        data: { items: items_to_res }
    })

})


router.get("/last_items", async (req, res) => {
    const items = await Items.find().sort({ $natural: 1 }).limit(10)
    res.json({ items })

})

router.get("/same_items/:id", async (req, res) => {
    const { id } = req.params
    let selected_item = await Items.findById(id)
    const { categorys } = selected_item
    let same_items = await Items.find({ _id: { $ne: id }, categorys: { $in: categorys } })
    for (var i = same_items.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = same_items[i];
        same_items[i] = same_items[j];
        same_items[j] = temp;
    }
    res.json({ items: same_items.slice(0, 3) })
})



router.post("/buy", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(1, res)
    const s_user = await User.findOne({ uid: user.uid })
    const { gold } = s_user
    const { item } = req.body
    let s_item = await Items.findById(item)
    if (gold < s_item.price) return reject(13, res)
    await User.findOneAndUpdate({ uid: s_user.uid }, {
        $inc: { gold: s_item.price * -1 },
        $push: { items: item }
    })
    res.json({
        status:true,
        msg:"",
        data:{}
    })
})



module.exports = router