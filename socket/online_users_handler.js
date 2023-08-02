const fs=require("fs")
const online_users_handler={

    add_user(user_id){
        let json_file=fs.readFileSync(`${__dirname}/online_users.json`)
        json_file=JSON.parse(json_file.toString())
        json_file.push(user_id)
        fs.writeFileSync(`${__dirname}/online_users.json`,JSON.stringify(json_file))
    },
    remove_user(user_id){
        let json_file=fs.readFileSync(`${__dirname}/online_users.json`)
        json_file=JSON.parse(json_file.toString())
        json_file=json_file.filter(e=>e != user_id)
        fs.writeFileSync(`${__dirname}/online_users.json`,JSON.stringify(json_file))
    },
    get_online_users(){
        let json_file=fs.readFileSync(`${__dirname}/online_users.json`)
        json_file=JSON.parse(json_file.toString())
        return json_file
    }

}

module.exports=online_users_handler