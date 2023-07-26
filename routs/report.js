const express = require("express")
const Jwt = require("../helper/jwt")
const Report = require("../db/report")
const router = express.Router()


router.post("/new_report", async (req, res) => {

    const { token, user_reported, game_id, report_type } = req.body
    let user = Jwt.verify(token)
    if (!user) return res.json({ status: false, msg: "invalid token" })
    let is_report_submitted = await Report.findOne({ game_id, user_submitted: user.uid })
    if (is_report_submitted) return res.json({ status: false, msg: "report submitted already" })
    new Report({ report_type, user_reported, user_submitted: user.uid, game_id }).save()
    res.json({ status: true, msg: "" })
    //check for report conditions

})



module.exports = router