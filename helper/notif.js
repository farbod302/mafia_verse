const User = require("../db/user")

const send_notif = async ({ user_id, title, msg }) => {

    let NOTIF_SERVER_URL = ""
    let user = await User.findOne({ uid: user_id })
    if (!user || !user.notif_token) return false
    fetch(`${NOTIF_SERVER_URL}/send_notif`, {
        method: "POST",
        body: JSON.stringify(
            {
                user_token: user.notif_token,
                title, msg
            }
        ),
        headers: {
            "Content-Type": "application/json"
        }
    })
    return true

}

module.exports = send_notif