const Helper = require("./helper")

const RegistSmsHandler = {
    _temp: [],
    send_sms(phone) {
        let random_num = Helper.generate_random_num(),
        // let random_num = 1234,
            msg = `کد تایید شما در بازی مافیا: \n ${random_num}`
        Helper.send_sms({phone, msg})
        RegistSmsHandler._temp.push({ phone, code: random_num })
        return random_num
    },
    check_code({ phone, code }) {
        let is_exis = RegistSmsHandler._temp.find(c => c.code == code && c.phone == phone)
        if (is_exis) {
            RegistSmsHandler._temp = RegistSmsHandler._temp.filter(c => c.phone !== phone)
            return true
        }
        return false
    }
}

module.exports=RegistSmsHandler