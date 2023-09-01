const livekitApi = require('livekit-server-sdk');
const AccessToken = livekitApi.AccessToken;
const RoomServiceClient = livekitApi.RoomServiceClient;
const livekitHost = "http://mafia.altf1.ir:7880"
console.log(
    process.env.LIVEKIT_SEC,
    process.env.LIVEKIT_API
);
const svc = new RoomServiceClient(livekitHost, process.env.LIVEKIT_API, process.env.LIVEKIT_SEC,);


const Voice = {
    async start_room(game_id) {
        const room_name = `${game_id}`
        const opts = {
            name: room_name,
            emptyTimeout: 1 * 60,
        };
        try {
            await svc.createRoom(opts)
        }
        catch (err) {
            console.log(err);
        }
    },
    join_room(user, game_id) {
        const at = new AccessToken('devkey', 'secret', {
            identity: `${user}`,
        });
        at.addGrant({ roomJoin: true, room: `${game_id}` });
        const token = at.toJwt();
        return token
    }
}

module.exports = Voice