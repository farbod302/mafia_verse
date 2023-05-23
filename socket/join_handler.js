
const Jwt=require("../helper/jwt")
const {uid:uuid}=require("uid")

const join_handler = ({ token,db,client }) => {
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
    client.join(user_party)
    client.idenity = idenity
    db.add_data("users", idenity)
    db.add_data("party", {
        party_id: user_party,
        users: [idenity]
    })

}

module.exports=join_handler