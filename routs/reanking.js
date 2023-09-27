const express = require("express")
const User = require("../db/user")
const router = express.Router()


router.get("/", async (req, res) => {
    const ranking = await User.find({}).sort({ session_rank: 1 }).limit(50)
    const clean_ranking = ranking.map(user => {
        const { idenity, session_rank, ranking, avatar, } = user
        return { idenity, session_rank, ranking, avatar }
    })
    res.json({
        status: true,
        msg: "",
        data: { ranking: clean_ranking }
    })
})



module.exports = router