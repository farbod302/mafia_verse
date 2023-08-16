
const fs = require("fs")
const express = require("express")
const { uid: uuid } = require("uid")
const reject = require("../helper/reject_handler")
const Item = require("../db/item")
const { multer_storage } = require("../helper/helper")
const router = express.Router()
const multer = require("multer")
const sha256 = require("sha256")
const Pay = require("../db/pay")
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
    res.json({
        status: hash === true_hash
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
    res.json({confirmed_pays})

})


module.exports = router 