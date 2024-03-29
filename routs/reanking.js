const express = require("express")
const User = require("../db/user")
const router = express.Router()
const fs = require("fs")


const prize_pool = {
    day: [
        300,
        200,
        100,
        50
    ],
    week: [
        1000,
        400,
        300,
        100
    ],
    month: [
        2500,
        1500,
        1000,
        200
    ]
}


router.post("/", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid: req_user_id } = user
    const sessions = ["day", "week", "month"]
    const session_json = fs.readFileSync(`${__dirname}/../session.json`)
    const json = JSON.parse(session_json.toString())
    let ranking_res = []
    for (let session of sessions) {
        const key = `session_rank.${session}`
        const ranking = await User.find({}).sort({ [key]: -1 })
        const first_50 = [...ranking].slice(0, 50)
        const clean_ranking = first_50.map((user, index) => {
            const { idenity, session_rank, ranking, avatar, points, uid, session_games_result } = user
            const { win, lose } = session_games_result[session]
            return {
                idenity: { name: idenity.name }, session_rank: session_rank[session], ranking, avatar: {
                    avatar: "files/" + avatar.avatar,
                    table: "files/" + avatar.table,
                }, win, lose, user_id: uid, rate: index + 1, prize: 0
            }
        })
        const user_self = ranking.findIndex(e => e.uid === req_user_id)
        const { idenity, session_rank, ranking: user_rank, avatar, uid, session_games_result } = ranking[user_self]
        const { win, lose } = session_games_result[session]
        const selected_session = json.find(e => e.range === session)
        ranking_res.push({
            session,
            session_end: selected_session.end,
            ranking_list: clean_ranking,
            user_self: {
                idenity: { name: idenity.name }, session_rank: session_rank[session], ranking: user_rank, avatar: {
                    avatar: "files/" + avatar.avatar,
                    table: "files/" + avatar.table,
                }, win, lose, user_id: uid, rate: user_self + 1, prize: 0
            }
        })
    }
    res.json({
        status: true,
        msg: "",
        data: { ranking: ranking_res,available:true }
    })

})


router.get("/", async (req, res) => {
    const key = `ranking.rank`

    const ranking = await User.find({}).sort({ [key]: -1 })
    const first_20 = [...ranking].slice(0, 20)
    const clean_ranking = first_20.map((user, index) => {
        const { idenity, session_rank, ranking, avatar, points, uid, session_games_result } = user
        const { win, lose } = session_games_result["month"]
        return {
            idenity: idenity.name, session_rank: session_rank["month"], ranking, avatar: {
                avatar: "files/" + avatar.avatar,
                table: "files/" + avatar.table,
            }, win, lose, user_id: uid, rate: index + 1, prize: 10
        }
    })
    res.json({
        status: true,
        msg: "",
        data: { ranking: clean_ranking }
    })


})



router.get("/overall", async (req, res) => {

    const users_ranking = await User.find({}, { idenity: 1, avatar: 1, ranking }).sort({ "ranking.rank": -1 }).limit(10)
    res.json({
        status: true,
        msg: "",
        data: { ranking: users_ranking }
    })

})



module.exports = router