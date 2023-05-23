const find_match = require("./find_match")

const handel_disconnect=({client,db,socket})=>{

    //handel dc during find match
    find_match.leave_find({client,db,socket})

}

module.exports=handel_disconnect