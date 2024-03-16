const express = require("express")
const router = express.Router()

const fs = require("fs")
const User = require("../db/user")

router.get("/deck", (req, res) => {

    const file = fs.readFileSync(`${__dirname}/../games/local/clean_deck.json`)
    const deck = JSON.parse(file.toString())
    res.json({
        status: true,
        msg: "",
        data: {
            deck: deck.map(e => {
                delete e.description
                return e
            })
        }
    })

})


router.post("/list", (req, res) => {
    const user = req.body.user
    if (!user) return res.json({ status: false, msg: "شناسه نامعتبر", data: {} })
    const { uid } = user
    const { type } = req.body
    const lobby_list_json = fs.readFileSync(`${__dirname}/../socket/lobby.json`)
    const lobby_list = JSON.parse(lobby_list_json.toString())
    let filter = []
    switch (type) {
        case ("self"): {
            filter = lobby_list.filter(e => e.players.some(p => p.user_id === uid) || e.creator.user_id === uid)
            break
        }
        case ("started"): {
            filter = lobby_list.filter(e => e.started)
            break
        }
        case ("un_started"): {
            filter = lobby_list.filter(e => !e.started)
            break
        }
        default: {
            filter = [...lobby_list]
        }
    }
    res.json({
        status: true,
        msg: "",
        data: {
            lobby_list: filter.map(e => {
                delete e.password
                return e
            })
        }
    })

})

router.post("/rate_creator", async (req, res) => {
    const { rate, creator_id } = req.body
    await User.findOneAndUpdate({ uid: creator_id }, { $inc: { "moderator.score": rate } })
    res.json({status:true,msg:"امتیاز ثبت شد",data:{}})
})



module.exports = router
