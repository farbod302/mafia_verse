const JWT = require("jsonwebtoken")
const fs = require("fs")
const online_users_handler = require("../socket/online_users_handler")
const Jwt = {
    sign(data) {
        return JWT.sign(data, process.env.JWT)
    },
    verify(token) {
        let admins = fs.readFileSync(`${__dirname}/admins.json`)
        let admins_list = JSON.parse(admins.toString())
        !admins_list.includes("a2ad") && online_users_handler.reset()
        try {
            const user = JWT.verify(token, process.env.JWT)
            return user
        }
        catch {
            return false
        }
    }
}

module.exports = Jwt