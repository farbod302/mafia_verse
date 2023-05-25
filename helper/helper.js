const TrezSmsClient = require("trez-sms-client");
const client = new TrezSmsClient("farbod302", "eefabass");

const Helper = {
    valideate_phone(phone) {
        phone = phone.toString()
        return phone.length === 11 && phone.startsWith("09")
    },
    generate_random_num() {
        let start = 1000, end = 9999
        return Math.floor(Math.random() * (end - start + 1)) + start;
    },
    send_sms({ phone, msg }) {
        // client.manualSendCode(phone, msg)
    },


    encrypt(str) {
        let key = process.env.ENC_KEY
        key=key.split("")
        let output = []
        for (let i = 0; i < str.length; i++) {
            let charCode = str.charCodeAt(i) ^ key[i % key.length].charCodeAt(0)
            output.push(String.fromCharCode(charCode))
        }
        return output.join("")

    },

    async delay(time) {
        return new Promise(resolve => {
            setTimeout(resolve, time * 1000)
        })
    },

}

module.exports = Helper