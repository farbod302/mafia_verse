const TrezSmsClient = require("trez-sms-client");
const client = new TrezSmsClient("farbod302", "eefabass");
const multer = require('multer');
const { uid } = require("uid");
const userChannelConfig = require("../db/user_channel_config");

const Helper = {
    valideate_phone(phone) {
        phone = phone.toString()
        console.log({ phone });
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
        key = key.split("")
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

    multer_storage: multer.diskStorage({
        
        destination: function (req, file, cb) {
            cb(null, `${__dirname}/../files`)
        },
        filename: function (req, file, cb) {
            let file_id = uid(5)
            const format = file.originalname.split(".").slice(-1)[0]
            let is_first_file=!req.body.files_list
            if(is_first_file)req.body.files_list=[file_id + '.' + format]
            else{req.body.files_list=req.body.files_list.concat(file_id + '.' + format)}
            cb(null, file_id + '.' + format)
        }
    }),



    create_channel_config({channel_id,user_id}){
        let new_conf={channel_id,user_id}
        new userChannelConfig(new_conf).save()
    }

}

module.exports = Helper