const express = require("express")
const router = express.Router()
const User = require("../db/user")
var base64ToImage = require('base64-to-image');
const { uid } = require("uid");



router.post("/submit_avatar_request", async (req, res) => {
    const user = req.body.user
    if (!user) return res.json({ status: false, mag: "شناسه نامعتبر اشت", data: {} })
    const selected_user = await User.findOne({ uid: user.uid })
    if (!selected_user || selected_user.gold < 1000) return res.json({ status: false, msg: "شما گلد کافی برای آپاتار اختصاصی ندارید", data: {} })
    const { image } = req.body
    //save image
    const path = `${__dirname}/../user_images`
    const name = `${user.uid}_${uid(5)}`
    const image_info = base64ToImage(image, path, {
        fileName: name,
        debug:true
    })
    console.log({image_info});
})



module.exports = router