const { default: axios } = require("axios")
const { uid } = require("uid")
const Pay = require("../db/pay")
const User = require("../db/user")

const payment = {
    callback: "http://localhost:4090",
    async send_req_to_api({ payload, path }) {
        const { data } = await axios.post('https://api.idpay.ir/v1.1/' + path, payload,
            {
                headers: {
                    'X-API-KEY': process.env.API_KEY,
                    'X-SANDBOX': 1,
                }
            })
        return data 
    },

    async create_pay({ user, gold_amount, price }) {
        let payment_local_id = uid(10)
        const payment_payload = {
            order_id: payment_local_id,
            name: user,
            amount: price,
            callback: this.callback
        }
        const payment_data = await this.send_req_to_api({ payload: payment_payload, path: "payment" })
        const { id, link } = payment_data
        const new_pay = {
            payment_local_id,
            payment_api_id: id,
            user,
            gold_amount,
            price,
            pay_from:"web",
            date:Date.now()
        }
        new Pay(new_pay).save()
        return link
    },


    async verify({ status, track_id, id, order_id }) {
        let is_used = await Pay.findOne({ payment_api_id: id, used: true })
        if (is_used) return false
        if (status !== 10) {
            await Pay.findOneAndUpdate({ payment_api_id: id }, { $set: { used: true } })
            return false
        } else {
            const verify = await this.send_req_to_api({ payload: { id, order_id }, path: "payment/verify" })
            const { status } = verify
            if (status != 100) {
                await Pay.findOneAndUpdate({ payment_api_id: id }, { $set: { used: true } })
                return false
            }
            const s_pay = await Pay.findOne({ payment_api_id: id })
            const { user, gold_amount } = s_pay
            await User.findOneAndUpdate({ uid: user }, { $inc: { gold: gold_amount } })
            await Pay.findOneAndUpdate({ payment_api_id: id }, { $set: { used: true, status: true, track_id } })
            return true
        }

    }

}

module.exports=payment