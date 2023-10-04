const express = require("express")
const User = require("../db/user")
const router = express.Router()
const fs = require("fs")

router.get("/", async (req, res) => {
    const sessions = ["day", "week", "session"]
    const session_json = fs.readFileSync(`${__dirname}/../session.json`)
    const json = JSON.parse(session_json.toString())
    let ranking_res = []
    for (let session of sessions) {
        const key = `session_rank.${session}`
        const ranking = await User.find({}).sort({ [key]: -1 }).limit(50)
        const clean_ranking = ranking.map(user => {
            const { idenity, session_rank, ranking, avatar, points, uid } = user
            const { win, lose } = points
            return {
                idenity, session_rank:session_rank[session], ranking, avatar: {
                    avatar: "/files/" + avatar.avatar,
                    tabel: "/files/" + avatar.tabel,
                }, win, lose, user_id: uid
            }
        })
        const selected_session = json.find(e => e.range === session)
        ranking_res.push({
            session,
            session_end: selected_session.end - Date.now(),
            ranking_list: clean_ranking,
        })
    }
    res.json({
        status: true,
        msg: "",
        data: { ranking: ranking_res }
    })

})



module.exports = router