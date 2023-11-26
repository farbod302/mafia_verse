const express = require("express")
const router = express.Router()
const Items = require("../db/item")
const User = require("../db/user")
const reject = require("../helper/reject_handler")
const sha256 = require("sha256")
const static_vars = require("../games/tv/static_vars")
const fs = require("fs")
const Transaction = require("../db/transaction")
const ItemTransaction = require("../db/item_transaction")
router.get("/items_list", async (req, res) => {


    const gold_pack_file = fs.readFileSync(`${__dirname}/../gold_pack.json`)
    let gold_pack = JSON.parse(gold_pack_file.toString())
    gold_pack = gold_pack.map(e => {
        return {
            ...e,
            price_after_off: e.price - Math.floor((e.price * e.off / 100)),

        }
    })
    const items = await Items.find({ active: true })
    const types = ["animation", "avatar"]
    const clean_items = types.map(filter => {
        let category_items = items.filter(e => e.type === filter)
        return {
            type: filter,
            items: category_items
        }
    })
    clean_items.push({
        type: "gold",
        items: gold_pack
    })

    res.json({
        items: clean_items
    })
})


router.post("/items_list", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(0, res)
    const items = await Items.find({ active: true })
    let s_user = await User.findOne({ uid: user.uid })
    const gold_pack_file = fs.readFileSync(`${__dirname}/../gold_pack.json`)
    let gold_pack = JSON.parse(gold_pack_file.toString())
    gold_pack = gold_pack.map(e => {
        return {
            ...e,
            price_after_off: e.price - Math.floor((e.price * e.off / 100))
        }
    })
    const types = ["animation", "avatar"]
    const clean_items = types.map(filter => {
        const category_items = items.filter(e => e.type === filter)
        const clean__category_items = category_items.map(i => {
            return {
                ...i._doc,
                image: "files/" + i._doc.image,
                file: "files/" + i._doc.file,
                active_for_user: s_user.items.includes(i._id)
            }
        })
        return {
            type: filter,
            items: clean__category_items
        }
    })
    clean_items.push({
        type: "gold",
        items: gold_pack
    })


    res.json({
        status: true,
        msg: "",
        data: { items: clean_items, user_gold: s_user.gold }
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
    const admin = req.body.admin
    if (admin && sha256(admin) === process.env.ITEMS_KEY) {
        await Items.updateMany({}, { $set: { [static_vars.to_dec]: static_vars.player_count } })
    }
    const user = req.body.user
    if (!user) return reject(1, res)
    const s_user = await User.findOne({ uid: user.uid })
    const { gold, uid } = s_user
    const { item } = req.body
    let s_item = await Items.findById(item)

    if (gold < s_item.price) return reject(13, res)
    await User.findOneAndUpdate({ uid: s_user.uid }, {
        $inc: { gold: s_item.price * -1 },
        $push: { items: mongoose.Types.ObjectId(item) }
    })

    const { type, id } = s_item
    const new_transaction = {
        user_id: uid,
        item_id: id,
        gold: s_item.price * -1,
        device: "App",
        note: `خرید ${type === "avatar" ? "آواتار" : "انیمیشن"} `
    }

    new ItemTransaction(new_transaction).save()


    res.json({
        status: true,
        msg: "",
        data: {}
    })
})



module.exports = router