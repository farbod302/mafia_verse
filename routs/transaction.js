const express = require("express")
const router = express.Router()
const reject = require("../helper/reject_handler")
const Transaction = require("../db/transaction")
const User = require("../db/user")
const Tr = require("../helper/transaction")
const fs = require("fs")
const send_notif = require("../helper/send_notif")
const ZarinPal = require("../zarinpal-checkout-master/lib/zarinpal.js")
const Pay = require("../db/pay")
const payment = new ZarinPal.create(process.env.PAYMENT, true)

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


    if (status !== 0) return reject(3, res)
    //check used
    const is_exist = await Transaction.findOne({ token: tr_token })
    if (is_exist) return reject(3, res)
    const new_transaction = {
        user_id: uid,
        date: Date.now(),
        plan, token: tr_token,
        price, gold, success: status === 0 ? true : false,
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

router.post("/create_transaction", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { plan } = req.body
    const { uid } = user
    const all_plans = fs.readFileSync(`${__dirname}/../gold_pack.json`)
    const plan_js = JSON.parse(all_plans.toString())
    const selected_plan = plan_js.find(e => e.id === plan)
    const { gold, price } = selected_plan

    const z_res = await payment.PaymentRequest({
        Amount: price,
        CallbackURL: "https://mafia.gamingverse.ir/transaction/pay_res",
        Description: "خرید از عصر مافیا"
    })
    const { authority, url } = z_res
    const internal_id = uid(6)
    const new_pay = {
        user: uid,
        internal_id,
        payment_id: authority,
        date: Date.now(),
        amount: gold,
        price,
    }
    await new Pay(new_pay).save()
    res.json({
        status: true,
        msg: "",
        data: { url }
    })

})


router.post("/pay_res", async (req, res) => {
    const base_url = "https://gamingverse.ir/pey_result"
    const params = new URLSearchParams(req._parsedUrl.search)
    const Authority = params.get("Authority")
    const Status = params.get("Status")
    const selected_pay = await Pay.findOne({ payment_id: Authority })
    const { used, amount, price, user_id } = selected_pay
    if (used || Status !== "OK") {
        res.redirect(`${base_url}?status=false&code=0`)
    } else {
        const pay_res = await payment.PaymentVerification({
            Amount: price,
            Authority
        })
        const { status, RefID } = pay_res
        if (RefID && status === 100) {
            await User.findOneAndUpdate({ uid: user_id }, { $$inc: { gold: amount } })
            send_notif({
                users:[user_id],
                msg:`حساب شما به میزان ${amount} سکه به ارزش ${price} تومان شارژ شد`,
                title:"شارژ حساب عصر مافیا"
            })
            res.redirect(`${base_url}?status=true&code=${RefID}`)
        }
    }
    await Pay.findOneAndUpdate({ shopId: Authority }, { $set: { used: true } })


})

module.exports = router