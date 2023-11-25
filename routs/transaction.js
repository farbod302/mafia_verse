const express = require("express")
const router = express.Router()
const reject = require("../helper/reject_handler")
const Transaction = require("../db/transaction")
const User = require("../db/user")
const Tr = require("../helper/transaction")
const send_notif = require("../helper/send_notif")

router.post("/confirm_transaction", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const { tr_token, plan, price, gold } = req.body
    console.log({tr_token, plan, price, gold});
    //check transaction from bazar
    const { purchaseState } =await Tr.check_transaction_result(plan, tr_token)
    console.log({purchaseState});
    if (purchaseState !== 0) return reject(3, res)
    //check used
    const is_exist = await Transaction.findOne({ token: tr_token })
    if (is_exist) return reject(3, res)
    const new_transaction = {
        user_id: uid,
        date: Date.now(),
        plan, token: tr_token,
        price, gold, success: purchaseState === 0 ? true : false,
        device:req.body.device|| "app",note:"افزایش اعتبار"
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
    await send_notif({users:[uid],msg:`خرید ${gold} سکه با موفقیت انجام شد`,title:"خرید انجام شد"})
})


module.exports = router