const express = require("express")
const { uid } = require("uid")
const TempSms = require("../db/temp_sms")
const router = express.Router()
const User = require("../db/user")
const Helper = require("../helper/helper")
const Jwt = require("../helper/jwt")
const RegistSmsHandler = require("../helper/regist_sms_handler")
const fs = require("fs")
const reject = require("../helper/reject_handler")
const send_notif = require("../helper/send_notif")
const { default: mongoose } = require("mongoose")
const default_avatar = {
    avatar: "11990.png",
    table: "a2e11.lottie",
    rols: []
}

router.post("/", async (req, res) => {
    let player_uid = uid(4)
    const new_player = {
        device_id,
        idenity: {
            name: `guest_${player_uid}`,
            phone: null
        },
        uid: player_uid,
        avatar: default_avatar,
        session_rank: {
            day: 125,
            week: 875,
            session: 3000
        }
    }
    new User(new_player).save()
    res.json({
        status: true,
        msg: "ثبت نام انجام شد",
        data: { token: Jwt.sign({ uid: player_uid, device_id }) }
    })

})



router.post("/check", async (req, res) => {
    const { phone } = req.body
    if (!Helper.valideate_phone(phone)) return reject(0, res)
    let is_exist = await User.findOne({ "idenity.phone": phone })
    res.json({ data: { is_exist: is_exist ? true : false, status: true } })
})

router.post("/sign_up", async (req, res) => {
    const { phone, name, firebase_token } = req.body
    const representative = req.body.representative
    if (representative) {
        const r_user = await User.findOne({ uid: representative })
        if (!r_user) return res.json({ status: false, msg: "کد معرف اشتباه است", data: {} })
    }
    let is_user_name_uniq = await User.findOne({ $or: [{ "idenity.name": name }, { "idenity.phone": phone }] })
    if (is_user_name_uniq) {
        res.json({
            status: false,
            msg: "نام کاربری تکراری است",
            data: {}
        })
        return
    }

    if (!Helper.valideate_phone(phone)) return reject(0, res)
    let code = RegistSmsHandler.send_sms(phone)
    new TempSms({ phone, name, code, notif_token: firebase_token }).save()
    res.json({
        status: true,
        msg: "کد تایید ارسال شد",
        data: {}
    })
    return
})

router.post("/sign_up_confirm_phone", async (req, res) => {
    const { code, phone, introducer } = req.body
    let temp = await TempSms.findOne({ code: code, phone: phone, used: false })
    if (!temp) return reject(1, res)
    const name = temp.name

    let player_uid = uid(4)


    let inter = false

    if (introducer) {
        const selected_user = await User.findOne({ uid: introducer })
        if (selected_user) {
            await User.findOneAndUpdate({ uid: selected_user.uid }, { $inc: { gold: 200 } })
            send_notif({
                users: [selected_user.uid],
                msg: ` کاربر: ${name} با کد معرفی شما به مافیاورس پیوست.شما ۲۰۰ سکه جایزه گرفتی `,
                title: "یکی از دوستات به بازی مافیاورس پیوست"
            })
            inter = true
        }
    }

    const new_player = {
        idenity: {
            name: name || "",
            phone: phone
        },
        uid: player_uid,
        gold: inter ? 400 : 200,
        avatar: default_avatar,
        notif_token: temp.notif_token,
        items:[
            new mongoose.Types.ObjectId("655da85c36fbec15db8bd959"),
            new mongoose.Types.ObjectId("655da8c536fbec15db8bd95c")
        ],
        session_rank: {
            day: 125,
            week: 875,
            session: 3000
        }
    }
    new User(new_player).save()



    res.json({
        status: true,
        msg: "ثبت نام با موفقیت انجام شد",
        data: { token: Jwt.sign({ uid: player_uid }) }
    })
    await TempSms.findOneAndUpdate({ code: code, phone: phone }, { $set: { used: true } })
})

router.post("/log_in", async (req, res) => {
    const { phone, name, firebase_token } = req.body
    let is_exist = await User.findOne(name ? { "idenity.name": name } : { "idenity.phone": phone })
    if (!is_exist) return reject(4, res)
    if (!Helper.valideate_phone(phone)) return reject(0, res)
    let code = RegistSmsHandler.send_sms(phone)
    res.json({
        status: true,
        msg: "کد تایید ارسال شد",
        data: {}
    })
})

router.post("/log_in_confirm_phone", async (req, res) => {

    const { code, phone } = req.body
    let is_exist = RegistSmsHandler.check_code({ phone, code })
    if (!is_exist) return reject(1, res)
    is_exist = await User.findOne({ "idenity.phone": phone })
    if (!is_exist) return reject(4, res)
    const { uid: user_id } = is_exist
    let token = Jwt.sign({ uid: user_id })
    res.json({
        status: true,
        msg: "",
        data: { token }
    })


})








module.exports = router