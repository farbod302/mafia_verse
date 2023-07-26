const express = require("express")
const router = express.Router()


router.post("/new_report", (req, res) => {

    const { token, user_to_report, report_type } = req.body
    

})



module.exports = router