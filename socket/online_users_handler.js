const fs = require("fs")
const online_users_handler = {


    reset(){
        fs.writeFileSync(`${__dirname}/online_users.json`, JSON.stringify([]))
    },

    add_user(user_id, socket_id) {
        let json_file = fs.readFileSync(`${__dirname}/online_users.json`)
        json_file = JSON.parse(json_file.toString())
        json_file=json_file.filter(e=>e.user_id === user_id)
        json_file.push({ user_id, socket_id })
        fs.writeFileSync(`${__dirname}/online_users.json`, JSON.stringify(json_file))
    },
    remove_user(user_id) {
        console.log({ user_id });
        let json_file = fs.readFileSync(`${__dirname}/online_users.json`)
        json_file = JSON.parse(json_file.toString())
        json_file = json_file.filter(e => e.user_id != user_id)
        fs.writeFileSync(`${__dirname}/online_users.json`, JSON.stringify(json_file))
    },
    get_online_users() {
        let json_file = fs.readFileSync(`${__dirname}/online_users.json`)
        json_file = JSON.parse(json_file.toString())
        return json_file
    },
    get_user_socket_id(user_id) {
        let json_file = fs.readFileSync(`${__dirname}/online_users.json`)
        json_file = JSON.parse(json_file.toString())
        let s_user = json_file.find(e => e.user_id === user_id)
        return s_user?.socket_id
    }

}

module.exports = online_users_handler