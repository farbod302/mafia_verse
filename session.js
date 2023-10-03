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
            case ("session"): range_time = 1000 * 60 * 60 * 24 * 7 * 4 * 3; default_rank = 3000; break
        }
        console.log({ range });
        const start = Date.now()
        const end = start + range_time
        const preview_session_start = start - range_time
        const preview_session_date = new Date(preview_session_start)
        const new_session_history = {
            start: preview_session_date,
            end: new Date(),
            range,
            result
        }
        const file_name = `${range}_${preview_session_date}`
        fs.writeFileSync(`${__dirname}/sessions_result/${file_name}.json`, JSON.stringify(new_session_history))
        console.log({ key });
        await User.updateMany({}, { $set: { [key]: default_rank } })
        const prv_sessions_record = fs.readFileSync(`${__dirname}/session.json`)
        const json = JSON.parse(prv_sessions_record.toLocaleString())
        const new_json = json.filter(e => e.range !== range)
        new_json.push({
            range,
            start,
            end
        })
        fs.writeFileSync(`${__dirname}/session.json`, JSON.stringify(new_json))
    }
}


module.exports = Session