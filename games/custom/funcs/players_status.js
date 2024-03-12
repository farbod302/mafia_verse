const players_status = {

    generate_all_players_status({ players, characters }) {
        const status = players.map((p, index) => {
            return {
                status: {
                    alive: true,
                    connected: false,
                    speech: false,
                    hand_rise: false,
                    day_act: false,
                    like: false,
                    dislike: false,
                    challenge: false,
                    challenge_accepted: false
                },
                user_id: p.user_id,
                user_index:index+1,
                avatar:p.image,
                character: characters[index].name,
                side: characters[index].side,
            }
        })
        return status
    },



}

module.exports = players_status