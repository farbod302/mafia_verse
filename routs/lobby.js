const express = require("express")
const router = express.Router()

const fs=require("fs")

router.get("/deck", (req, res) => {

    const file = fs.readFileSync(`${__dirname}/../games/local/clean_deck.json`)
    const deck = JSON.parse(file.toString())
    res.json({
        status: true,
        msg: "",
        data: { deck:deck.map(e=>{
            delete e.description
            return e
        }) }
    })

})


router.get("/list",(req,res)=>{
    const lobby_list_json=fs.readFileSync(`${__dirname}/../socket/lobby.json`)
    const lobby_list = JSON.parse(lobby_list_json.toString())
    res.json({
        status: true,
        msg: "",
        data: { lobby_list:lobby_list.map(e=>{
            delete e.password
            return e
        }) }
    })

})


module.exports = router
