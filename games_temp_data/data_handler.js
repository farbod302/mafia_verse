const fs = require("fs")

const data_handler = {
    create_game(game_id) {
        fs.writeFileSync(`${__dirname}/games/${game_id}.json`, "[]")
    },
    add_data(game_id, data) {
        const game_file = fs.readFileSync(`${__dirname}/games/${game_id}.json`)
        const json = JSON.parse(game_file.toString())
        json.push(data)
        fs.writeFileSync(`${__dirname}/games/${game_id}.json`, JSON.stringify(json))
    }
}

module.exports=data_handler