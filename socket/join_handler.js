
const Jwt=require("../helper/jwt")
const {uid:uuid}=require("uid")

const join_handler = ({ token,db,client,socket }) => {
    const user = Jwt.verify(token)
    if (!user) return
    const { uid, device_id } = user
    let user_party = uuid(5)
    let idenity = {
        socket_id: client.id,
        party_id: user_party,
        user_id: uid,
        device_id
    }
    let user_exist_game=db.getOne("disconnect","user_id",uid)
    if(user_exist_game){
        socket.to(client.id).emit("has_exist_game")
    }
    client.join(user_party)
    client.idenity = idenity
    db.add_data("users", idenity)
    db.add_data("party", {
        party_id: user_party,
        users: [idenity]
    })
    socket.to(client.socket_id).emit("join_status",{data:{user_id:uid}})
}

module.exports=join_handler