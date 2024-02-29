const express = require("express")
const router = express.Router()
const reject = require("../helper/reject_handler")
const Transaction = require("../db/transaction")
const User = require("../db/user")
const Tr = require("../helper/transaction")
const fs = require("fs")
const send_notif = require("../helper/send_notif")

router.post("/confirm_transaction", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid } = user
    const { tr_token, plan, platform } = req.body

    //check transaction from bazar
    const all_plans = fs.readFileSync(`${__dirname}/../gold_pack.json`)
    const plan_js = JSON.parse(all_plans.toString())
    const selected_plan = plan_js.find(e => e.id === plan)
    const { gold, price } = selected_plan

    let status

    if (platform) {
        const { purchaseState } = await Tr.check_transaction_result_market(plan, tr_token)
        status = purchaseState

    } else {
        const { purchaseState } = await Tr.check_transaction_result(plan, tr_token)
        status = purchaseState
    }


    if (purchaseState !== 0) return reject(3, res)
    //check used
    const is_exist = await Transaction.findOne({ token: tr_token })
    if (is_exist) return reject(3, res)
    const new_transaction = {
        user_id: uid,
        date: Date.now(),
        plan, token: tr_token,
        price, gold, success: purchaseState === 0 ? true : false,
        device: req.body.device || "app", note: "افزایش اعتبار"
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
    await send_notif({ users: [uid], msg: `خرید ${gold} سکه با موفقیت انجام شد`, title: "خرید انجام شد" })
})


module.exports = router