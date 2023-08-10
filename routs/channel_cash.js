const Channel = require("../db/channel")


const max_space = 250

const game_cash = async (channel_id) => {
    let s_channel = await Channel.findOne({ id: channel_id })
    if (!s_channel) return 
    let games_count = s_channel.games.length
    if (games_count === max_space) {
        let new_games = [...s_channel.games]
        new_games=new_games.slice(10)
        await Channel.findOneAndUpdate({ id: channel_id }, { $set: { games: new_games } })
    }
}



const msg_cash = async (channel_id) => {
    let s_channel = await Channel.findOne({ id: channel_id })
    if (!s_channel) return 
    let messages_count = s_channel.messages.length
    if (messages_count === max_space) {
        let new_messages = [...s_channel.messages]
        new_messages=new_messages.slice(10)
        await Channel.findOneAndUpdate({ id: channel_id }, { $set: { messages: new_messages } })
       
    }
}


module.exports = { game_cash, msg_cash }