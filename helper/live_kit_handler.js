const livekitApi = require('livekit-server-sdk');
const AccessToken = livekitApi.AccessToken;
const RoomServiceClient = livekitApi.RoomServiceClient;
const livekitHost = "https://voice.gamingverce.ir"

const svc = new RoomServiceClient(livekitHost, process.env.LIVEKIT_API, process.env.LIVEKIT_SEC,);


const Voice = {
    async start_room(game_id) {
        const room_name = `${game_id}`
        const opts = {
            name: room_name,
            emptyTimeout: 2 * 60,
        };
        try {
            await svc.createRoom(opts)
        }
        catch (err) {
            console.log(err);
        }
    },
    join_room(user, game_id) {
        const at = new AccessToken(process.env.LIVEKIT_API, process.env.LIVEKIT_SEC, {
            identity: `${user}`,
        });
        at.addGrant({
            roomJoin: true,
            room: `${game_id}`,
            canPublish: true,
            canSubscribe: true,
        });
        const token = at.toJwt();
        return token
    }
}

module.exports = Voice