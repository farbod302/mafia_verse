const { character_translator } = require("../../../helper/helper")

const game_result = {

    mafia_sides: ["god_father", "nato", "hostage_taker"],

    game_result_generator({ game_vars, users, winner }) {
        const { carts } = game_vars
        const clean_list = users.map(user => {
            const { user_id } = user
            let user_char = carts.find(e => e.user_id === user_id)
            user_char = user_char.name
            let side = this.mafia_sides.includes(user_char)
            side = side ? "mafia" : "citizen"
            return {
                ...user,
                point: 25 * (side === winner ? 1 : -1),
                side,
                role: character_translator(user_char), 
                xp: side === winner ? 100 : 50,
                winner:side === winner
            }
        })
        console.log({
            clean_list
        });
        return {
            winner,
            users: clean_list,
            scenario: "nato",
            free_speech_timer: 1
        }
    }

}


module.exports = game_result