const { default: axios } = require("axios")

const Transaction = {
    bazar_client_id: "8IYh2qqyJw3XEY3ORCP40pqg1tlM3w19N5Hm9vNF",
    bazar_client_secret: process.env.BAZAR_SECRET,
    api_access_code: "T8pb0GGJFbHZKcaeCZntPrJwzxAbE9",
    bazar_refresh_token: "E6gbxU5vqEKrmoEhBzG42pInn5EpWu",
    market_access_token: "3da2bf2a-11d8-4ba6-98dd-ce33b41aedfa",
    async refresh_token() {

        const details = {
            grant_type: "refresh_token",
            client_id: this.bazar_client_id,
            client_secret: this.bazar_client_secret,
            refresh_token: this.bazar_refresh_token
        }
        const { data } = await axios.post("https://pardakht.cafebazaar.ir/devapi/v2/auth/token/", new URLSearchParams(details), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const { access_token } = data
        this.bazar_access_token = access_token


    },

    async check_transaction_result(plan_id, transaction_token) {
        try {
            const { data } = await axios.get(`https://pardakht.cafebazaar.ir/devapi/v2/api/validate/ir.greendex.mafia/inapp/${plan_id}/purchases/${transaction_token}/`
                , {
                    headers: {
                        Authorization: this.bazar_access_token
                    }
                })
            return data
        } catch (err) {
            console.log(err);
            return { purchaseState: 1 }
        }
    },

    async check_transaction_result_market(plan_id, transaction_token) {
        const { data } = await axios.get(`https://developer.myket.ir/api/applications/ir.greendex.mafia/purchases/products/${plan_id}/tokens/${transaction_token}`
            , {
                headers: {
                    "X-Access-Token": this.market_access_token
                }
            }
        )
            console.log(data);
    }
}

module.exports = Transaction

