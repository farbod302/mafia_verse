const Helper = require("../../../helper/helper")
const { character_translator } = require("../../../helper/helper")
const spin = require("../../../routs/spin")

const game_result = {

    mafia_sides: ["godfather", "nato", "hostage_taker"],

    async game_result_generator({ game_vars, users, winner }) {
        const { carts } = game_vars
        const clean_list = users.map(async user => {
            const { user_id } = user
            let user_char = carts.find(e => e.user_id === user_id)
            user_char = user_char.name
            let side = game_result.mafia_sides.includes(user_char) ? "mafia" : "citizen"
            const giveaway = side === winner && spin()
            let item_giveaway = null
            if (giveaway) {
                item_giveaway = await Helper.send_giveaway(user_id)
            }
            return {
                ...user,
                point: 25 * (side === winner ? 1 : -1),
                side,
                role: character_translator(user_char),
                xp: side === winner ? 100 : 50,
                winner: side === winner,
                item_giveaway,
                gold: side === winner ? 50 : 0
            }
        })
        const list = await Promise.all(clean_list)
        return {
            winner,
            users: list,
            scenario: "nato",
            free_speech_timer: 1
        }
    }

}


module.exports = game_result