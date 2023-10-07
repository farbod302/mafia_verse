const express = require("express")
const router = express.Router()
const reject = require("../helper/reject_handler")
const Transaction = require("../db/transaction")
const User = require("../db/user")


router.post("/confirm_transaction", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const { tr_token, plan, price, gold } = req.body
    //check transaction from bazar
    //check used
    const new_transaction = {
        user_id: uid,
        date: Date.now(),
        plan, token: tr_token,
        price, gold, success: true
    }
    await new Transaction(new_transaction).save()
    await User.findOneAndUpdate({ uid }, { $inc: { gold } })
    res.json({
        status: true,
        msg: `خرید ${gold} سکه با موفقیت انجام شد`,
        data: {
            gold
        }
    })
})


module.exports = router