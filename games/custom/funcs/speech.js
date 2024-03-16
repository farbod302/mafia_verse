const { AccessToken, } = require("livekit-server-sdk")
const Helper = require("../../../helper/helper")
const Voice = require("../../../helper/live_kit_handler")

const speech = {
    async create_room({ lobby_id }) {
        await Voice.start_room(lobby_id)
    },
    async create_join_token({ user_id, lobby_id }) {
        await Helper.delay(3)
        const at = new AccessToken(process.env.LIVEKIT_API, process.env.LIVEKIT_SEC, {
            identity: `${user_id}`,
        });
        at.addGrant({
            roomJoin: true,
            room: `${lobby_id}`,
            canPublish: true,
            canSubscribe: true,
        });
        const token = at.toJwt();
        return token
    }
}

module.exports = speech