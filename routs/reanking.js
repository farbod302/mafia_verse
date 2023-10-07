const express = require("express")
const User = require("../db/user")
const router = express.Router()
const fs = require("fs")

router.post("/", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid:req_user_id } = user
    const sessions = ["day", "week", "session"]
    const session_json = fs.readFileSync(`${__dirname}/../session.json`)
    const json = JSON.parse(session_json.toString())
    let ranking_res = []
    for (let session of sessions) {
        const key = `session_rank.${session}`
        const ranking = await User.find({}).sort({ [key]: -1 })
        const first_50 = [...ranking].slice(0, 50)
        const clean_ranking = first_50.map((user, index) => {
            const { idenity, session_rank, ranking, avatar, points, uid } = user
            const { win, lose } = points
            return {
                idenity, session_rank: session_rank[session], ranking, avatar: {
                    avatar: "files/" + avatar.avatar,
                    tabel: "files/" + avatar.tabel,
                }, win, lose, user_id: uid, rate: index + 1
            }
        })
        const user_self = ranking.findIndex(e => e.uid === req_user_id)
        const { idenity, session_rank, ranking: user_rank, avatar, points, uid } = ranking[user_self]
        const { win, lose } = points
        const selected_session = json.find(e => e.range === session)
        ranking_res.push({
            session,
            session_end: selected_session.end - Date.now(),
            ranking_list: clean_ranking,
            user_self: {
                idenity, session_rank: session_rank[session], ranking: user_rank, avatar: {
                    avatar: "files/" + avatar.avatar,
                    tabel: "files/" + avatar.tabel,
                }, win, lose, user_id: uid, rate: user_self + 1
            }
        })
    }
    res.json({
        status: true,
        msg: "",
        data: { ranking: ranking_res }
    })

})



module.exports = router