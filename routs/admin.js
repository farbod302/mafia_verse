
const fs = require("fs")
const express = require("express")
const { uid: uuid, uid } = require("uid")
const reject = require("../helper/reject_handler")
const Item = require("../db/item")
const Review = require("../db/review")
const { multer_storage } = require("../helper/helper")
const router = express.Router()
const multer = require("multer")
const sha256 = require("sha256")
const Pay = require("../db/pay")
const User = require("../db/user")
const send_notif = require("../helper/send_notif")
const { default: mongoose } = require("mongoose")
const check_admin = (req, res, next) => {
    try {
        const admin_list = fs.readFileSync(`${__dirname}/../helper/admins.json`)
        const admin_list_json = JSON.parse(admin_list)
        const uid = req.body.user?.uid
        if (!uid) return reject(3, res)
        if (!admin_list_json.includes(uid)) return reject(3, res)
        next()
        return

    }
    catch (err) {
        console.log(err);
        return reject(3, res)

    }

}


const upload = multer({ storage: multer_storage })


router.post("/upload", upload.array("file"), (req, res) => {

    res.json({
        status: true,
        msg: "",
        data: { files_list: req.body.files_list }
    })


})


router.post("/add_item", check_admin, async (req, res) => {
    const { name, file, image, price, categorys, type, active } = req.body
    const new_item = {
        name, file, image, price, categorys, type, active
    }
    let item_id = uuid(5)
    new_item.id = item_id
    new Item(new_item).save()
    res.json({
        status: true,
        msg: "آیتم با موفقیت اضافه شد",
        data: {}
    })


})




router.post("/log_in", (req, res) => {
    const { password } = req.body
    let true_hash = process.env.ADMIN_PANEL_PASSWORD
    let hash = sha256(password)
    console.log(hash);
    res.json({
        status: hash === true_hash
    })
})


router.get("/avatar_upload", async (req, res) => {
    const requests = await Review.find({ status: 0 })
    res.json({ requests })
})

router.post("/review_avatar", async (req, res) => {
    const { status, review_id } = req.body
    const selected_review = await Review.findOne({ review_id })
    const { user_id, file_name } = selected_review
    if (!status) {
        await Review.findOneAndUpdate({ review_id }, { $set: { status: 1 } })
        await User.findOneAndUpdate({ uid: user_id }, { $inc: { gold: 1000 } })
        send_notif({
            users: [user_id],
            msg: "آواتار اختصاصی شما به دلیل نقض قوانین بازی تایید نشد و سکه شما به حساب شما برگشت زده شد",
            title: "آواتار اختصاصی تایید نشد!"
        })
    } else {
        fs.renameSync(`${__dirname}/../user_images/${file_name}`, `${__dirname}/../files/${file_name}`)
        const new_item = {
            id: uid(5),
            name: "Custom Avatar",
            price: 0,
            image: file_name,
            file: file_name,
            categorys: [],
            type: "avatar",
            rel_items: [],
            active: false,
        }
        const item_added = await new Item(new_item).save()
        console.log({item_added});
        const { _id } = item_added
        await User.findOneAndUpdate({ uid: user_id },
            {
                $set: { "avatar.avatar": file_name },
                $push: { items: new mongoose.Types.ObjectId(_id) }
            })
        send_notif({
            users: [user_id],
            title: "آواتار اختصاصی تایید شد!",
            msg: "آواتار اختصاصی شما تایید شد و به حساب شما اضافه شد "
        })
    }
    res.json({
        status:true
    })
})

router.post("/add_admin", (req, res) => {
    const { new_admin, op } = req.body
    if (!new_admin) return reject(3, res)
    let prv_list = fs.readFileSync(`${__dirname}/../helper/admins.json`)
    prv_list = JSON.parse(prv_list.toString())
    if (op) {
        prv_list.push(new_admin)
    } else {
        prv_list = prv_list.filter(e => e !== new_admin)
    }
    fs.writeFileSync(`${__dirname}/../helper/admins.json`, JSON.stringify(prv_list))
    res.json(true)
})


router.post("/get_payments", check_admin, async (req, res) => {

    let confirmed_pays = await Pay.find({ status: true })
    res.json({ confirmed_pays })

})

router.post("/edit_version", check_admin, (req, res) => {
    const { new_version } = req.body
    fs.writeFileSync("../version.json", JSON.stringify({ v: new_version }))
    res.json({ status: true, msg: "", data: {} })
})


module.exports = router 