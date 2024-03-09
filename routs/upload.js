const express = require("express")
const router = express.Router()
const User = require("../db/user")
const Review = require("../db/review")
var base64Img = require('base64-img');
const { uid } = require("uid");
const static_url = "https://mafia.altf1.ir:4090/user_images"


router.post("/submit_avatar_request", async (req, res) => {
    const user = req.body.user
    if (!user) return res.json({ status: false, mag: "شناسه نامعتبر اشت", data: {} })
    const selected_user = await User.findOne({ uid: user.uid })
    if (!selected_user || selected_user.gold < 1000) return res.json({ status: false, msg: "شما گلد کافی برای آپاتار اختصاصی ندارید", data: {} })
    const { image } = req.body
    //save image
    const path = `${__dirname}/../user_images`
    const name = `${user.uid}_${uid(5)}`
    const format = (image.split("/")[1]).split(";")[0]

    base64Img.imgSync(image, path, name)
    const review_id = uid(7)
    const new_review_request = {
        user_id: user.uid,
        review_id,
        image: `${static_url}/${name}.${format}`
    }
    new Review(new_review_request).save()
    res.json({
        status: true,
        msg: "درخواست شما ثبت شد آواتار پس از تایید به حساب شما اضافه خواهد شد",
        data: { review_id }
    })
    await User.findOneAndUpdate({ uid: user_id }, { $ind: { gold: -1000 } })
})



module.exports = router