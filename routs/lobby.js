const express = require("express")
const router = express.Router()

const fs=require("fs")

router.get("/deck", (req, res) => {

    const file = fs.readFileSync(`${__dirname}/../games/local/clean_deck.json`)
    const deck = JSON.parse(file.toString())
    res.json({
        status: true,
        msg: "",
        data: { deck }
    })

})


module.exports = router
