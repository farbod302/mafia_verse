const express = require("express")
const User = require("../db/user")
const reject = require("../helper/reject_handler")
const Channel = require("../db/channel")
const router = express.Router()
const Item = require("../db/item")
const { default: mongoose } = require("mongoose")
//fetach data
router.post("/land_screen_data", async (req, res) => {
    const { uid } = req.body.user
    let user = await User.findOne({ uid })
    if (!user) return reject(5, res)
    const { gold, chanel_id, idenity, cart } = user
    const { name } = idenity
    res.json({
        status: true,
        msg: "",
        data: { gold, chanel_id, name, cart: cart.length }
    })
})

router.post("/profile_data", async (req, res) => {

    const { uid } = req.body.user
    const user = await User.findOne({ uid })
    if (!user) return reject(5, res)
    const { followers, friend_list, points, gold, status, ranking } = user
    const data = { followers: followers.length, friend_list: friend_list.length, points, gold, status, ranking }
    res.json({
        status: true,
        msg: "",
        data
    })
})
//friend 
router.post("/friend_req", async (req, res) => {
    const { uid } = req.body.user
    const { req_id } = req.body
    let req_persen = await User.findOne({ uid: req_id })
    const { friend_list_req } = req_persen
    if (friend_list_req.includes(uid)) return reject(6, res)
    await User.findOneAndUpdate({ uid: req_id }, { $push: { friend_list_req: uid } })
    res.json({
        status: true,
        msg: "درخواست ارسال شد",
        data: {}
    })
    return
})

router.post("/friend_list", async (req, res) => {
    const { uid } = req.body.user
    const { op } = req.body
    //for friend req list
    let user = await User.findOne({ uid })
    const { friend_list_req, friend_list } = user
    let req_users = await User.find({ uid: { $in: !op ? friend_list_req : friend_list } })
    req_users = req_users.map(e => {
        const { uid, idenity, avatar, ranking } = e
        return { uid, idenity, avatar, ranking }
    })
    res.json({
        status: true,
        msg: "",
        data: { list: req_users }
    })
})

router.post("/accept_friend_req", async (req, res) => {
    const { uid } = req.body.user
    const { uid: accepted_uid } = req.body
    await User.findOneAndUpdate({ uid: accepted_uid }, { $push: { friend_list: uid } })
    await User.findOneAndUpdate({ uid: uid }, { $push: { friend_list: accepted_uid }, $pull: { friend_list_req: accepted_uid } })
    res.json({
        status: true,
        msg: "درخواست تایید شد",
        data: {}
    })
})

//followers
router.post("/follow_user", async (req, res) => {
    const { uid } = req.body.user
    const { uid: req_uid } = req.body
    await User.findOneAndUpdate({ uid }, { $push: { following: req_uid } })
    res.json({
        status: true,
        msg: "درخواست انجام شد",
        data: {}
    })

})

router.post("/follow_list", async (req, res) => {
    const { uid } = req.body.user
    const { op } = req.body
    let list
    if (op) {
        list = await User.find({ following: uid })
    }
    else {
        let user = await User.findOne({ uid })
        const { following } = user
        list = await User.find({ uid: { $in: following } })
    }
    list = list.map(e => {
        const { uid, idenity, avatar, ranking } = e
        return { uid, idenity, avatar, ranking }
    })
    res.json({
        status: true,
        msg: "",
        data: { list }
    })
})
//items

router.post("/items_list", async (req, res) => {

    const user = req.body.user
    if (!user) return reject(1, res)
    let user_with_items = await User.aggregate([{ $match: { uid: user.uid } },{
        $lookup:{
            from:"items",
            foreignField:"_id",
            localField:"items",
            as:"user_items"
        }
    }])
    const items_list=user_with_items[0].user_items
    res.json({
        status: true,
        msg: "",
        data: { items: items_list }
    })

})

router.post("/profile", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(1, res)
    const s_user = await User.findOne({ uid: user.uid })
    res.json({
        status: true,
        data: s_user
    })
})


//chanel

router.post("/request_join_channnel", async (req, res) => {
    if (!req.body.user) return reject(2, res)
    const { uid } = req.body.user
    const { channel_id } = user.body
    let is_requested = await Channel.findOne({ join_req: uid, id: channel_id })
    if (is_requested) return reject(11, res)
    await Channel.findOneAndUpdate({ id: channel_id }, { $push: { join_req: uid } })
    res.json({ status: true, msg: "درخواست شما ثبت شد", data: {} })
})


router.post("/add_to_cart", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(13, res)
    const { uid } = user
    const { item } = req.body
    const user_items = await User.findOne({ uid })
    const { items, cart } = user_items
    let total = items.concat(cart)
    total = total.map(e => `${e}`)
    if (total.includes(item)) return reject(14, res)
    await User.findOneAndUpdate({ uid }, { $push: { cart: new mongoose.Types.ObjectId(item) } })
    res.json({
        status: true,
        msg: "کالا به سبد خرید اضافه شد"
    })
})

router.post("/remove_from_cart", async (req, res) => {
    const { item, user } = req.body
    const { uid } = user
    await User.findOneAndUpdate({ uid }, { $pull: { cart: new mongoose.Types.ObjectId(item) } })
    res.json({
        status: true,
        msg: "کالا از سبد خرید حذف شد"
    })
})

router.post("/user_cart", async (req, res) => {
    const user = req.body.user
    const { uid } = user

    let user_with_items = await User.aggregate([{ $match: { uid } }, {
        $lookup: {
            from: "items",
            localField: "cart",
            foreignField: "_id",
            as: "user_cart"
        }
    }])

    let selected_items = user_with_items[0].user_cart
    let selected_item_price = selected_items.reduce((a, b) => { return a + b.price }, 0)
    res.json({
        status: true,
        mag: "",
        data: { cart: selected_items, price: selected_item_price }
    })
})


router.post("/shop_finalize", async (req, res) => {
    const user = req.body.user
    const { uid } = user

    let user_with_items = await User.aggregate([{ $match: { uid } }, {
        $lookup: {
            from: "items",
            localField: "cart",
            foreignField: "_id",
            as: "user_cart"
        }
    }])

    let selected_items = user_with_items[0].user_cart
    let selected_item_price = selected_items.reduce((a, b) => { return a + b.price }, 0)
    const user_balance = user_with_items[0].gold
    if (user_balance < selected_item_price) return reject(15, res)
    await User.findOneAndUpdate({ uid },
        {
            $inc: { gold: selected_item_price * -1 },
            $set: { cart: [] },
            $push: { items: { $each: user_with_items[0].cart } }
        }
    )
    res.json({
        status: true,
        msg: "خرید انجام شد",
        data: {}
    })
})

module.exports = router
