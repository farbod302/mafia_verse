const express = require("express")
const { uid } = require("uid")
const TempSms = require("../db/temp_sms")
const router = express.Router()
const User = require("../db/user")
const Helper = require("../helper/helper")
const Jwt = require("../helper/jwt")
const RegistSmsHandler = require("../helper/regist_sms_handler")
const reject = require("../helper/reject_handler")
const default_avatar = {
    avatar: "0.png",
    tabel: "0.png",
    rols: []
}

router.post("/", async (req, res) => {
    const { device_id } = req.body
    let is_exist = await User.findOne({ device_id })
    if (is_exist) {
        const { uid: player_uid } = is_exist
        const token = Jwt.sign({ uid: player_uid, device_id })
        res.json({
            status: true,
            msg: "ورود انجام شد",
            data: { token }
        })
        return
    }
    let player_uid = uid(4)
    const new_player = {
        device_id,
        identity: {
            name: `guest_${player_uid}`,
            phone: null
        },
        uid: player_uid,
        avatar: default_avatar
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
    let is_exist = await User.findOne({ "identity.phone": phone })
    res.json({ data: { is_exist: is_exist ? true : false, status: true } })
})

router.post("/sign_up", async (req, res) => {
    const { phone, name } = req.body
    let is_user_name_uniq = await User.findOne({ $or: [{ "identity.name": name }, { "identity.phone": phone }] })
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
    console.log({ code });
    new TempSms({ phone, name, code }).save()
    res.json({
        status: true,
        msg: "کد تایید ارسال شد",
        data: {}
    })
    return
})

router.post("/sign_up_confirm_phone", async (req, res) => {
    const { code, phone } = req.body
    let temp = await TempSms.findOne({ code: code, phone: phone, used: false })
    if (!temp) return reject(1, res)
    const  name  = temp.name

    let player_uid = uid(4)
    const new_player = {
        identity: {
            name: name || "",
            phone: phone
        },
        uid: player_uid,
        avatar: default_avatar
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
    const { phone, name } = req.body
    let is_exist = await User.findOne(name ? { "identity.name": name } : { "identity.phone": phone })
    if (!is_exist) return reject(4, res)
    if (!Helper.valideate_phone(phone)) return reject(0, res)
    let code = RegistSmsHandler.send_sms(phone)
    console.log(code);
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
    is_exist = await User.findOne({ "identity.phone": phone })
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