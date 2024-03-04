const express = require("express")
const Jwt = require("../helper/jwt")
const Report = require("../db/report")
const router = express.Router()


router.post("/game_play", async (req, res) => {
    const user = req.body.user
    const { report_id, game_id, kind } = req.body
    let now = Date.now()
    if (!user) return res.json({ status: false, msg: "invalid token" })
    let is_report_submitted = await Report.findOne({ game_id, user_submitted: user.uid })
    if (is_report_submitted) return res.json({ status: false, msg: "گزارش شما قبلا ثبت شده" })
    new Report({ kind, report_id, user_submitted: user.uid, game_id, date: now }).save()
    res.json({ status: true, msg: "گزارش شما ثبت شد", data: {} })
    //check for report conditions

})



module.exports = router