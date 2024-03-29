const User = require("./db/user")
const fs = require("fs")
const Session = {
    async create_session(range) {
        //end prv session
        const key = `session_rank.${range}`
        const result = await User.find({}, { uid: 1, session_rank: 1, ranking: 1 }).sort({ [key]: -1 }).limit(50)
        let range_time = 0, default_rank = 0
        switch (range) {
            case ("day"): range_time = 1000 * 60 * 60 * 24; default_rank = 125; break
            case ("week"): range_time = 1000 * 60 * 60 * 24 * 7; default_rank = 875; break
            case ("month"): range_time = ((1000 * 60 * 60 * 24 * 7 * 4) + (1000 * 60 * 60 * 24 * 2)); default_rank = 3000; break
        }

        //give prize
        const { prize } = this.prize_pool.find(e => e.range === range)
        const more_than_4 = result.slice(3)
        const ids = more_than_4.map(e => e.uid)
        const promises = [
            User.findOneAndUpdate({ uid: result[0].uid }, { $inc: { gold: prize[0] } }),
            User.findOneAndUpdate({ uid: result[1].uid }, { $inc: { gold: prize[1] } }),
            User.findOneAndUpdate({ uid: result[2].uid }, { $inc: { gold: prize[2] } }),
            User.updateMany({ uid: { $in: ids } }, { $inc: { gold: prize[3] } }),
        ]
        // await Promise.all(promises)
        const start = Date.now()
        const end = start + range_time
        const preview_session_start = start - range_time
        const preview_session_date = new Date(preview_session_start)
        const str_data = preview_session_date.getFullYear() + "_" + preview_session_date.getMonth() + "_" + preview_session_date.getDate()
        const new_session_history = {
            start: preview_session_date,
            end: new Date(),
            range,
            result
        }

        const session_win_lose_key = `session_games_result.${range}`
        fs.writeFileSync(`${__dirname}/sessions_result/${range}_${str_data}.json`, JSON.stringify(new_session_history))
        await User.updateMany({}, { $set: { [key]: default_rank, [session_win_lose_key]: { win: 0, lose: 0 } } })
        const prv_sessions_record = fs.readFileSync(`${__dirname}/session.json`)
        const json = JSON.parse(prv_sessions_record.toLocaleString())
        const new_json = json.filter(e => e.range !== range)
        new_json.push({
            range,
            start,
            end
        })
        fs.writeFileSync(`${__dirname}/session.json`, JSON.stringify(new_json))
    },
    prize_pool: [
        {
            range: "day",
            prize: [
                300,
                200,
                100,
                50
            ]
        },
        {
            range: "week",
            prize: [
                1000,
                400,
                300,
                100
            ]
        },
        {
            range: "month",
            prize: [
                2500,
                1500,
                1000,
                200
            ]
        }
    ]
}


module.exports = Session