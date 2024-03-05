const players_status = {

    generate_player_status({ user_id }) {
        const player = {
            status: {
                alive: true,
                disconnect: false,
                speech: false,
                hand_rise: false,
                day_act: false,
                like: false,
                dislike: false,
                challenge: false
            },
        }
        return player
    }


}

module.exports = players_status