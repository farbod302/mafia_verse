const Dynamic_vars = class {
    constructor({ players, carts, characters, creator }) {
        this.players = players
        this.carts = carts
        this.characters = characters
        this.creator = creator
    }
    edit_event(op, event, value) {
        switch (op) {
            case ("edit"): {
                return this[event] = value == "plus" ? this[event] + 1 : value
            }
            case ("push"): {
                return this[event].push(value)
            }
            case ("pull"): {
                return this[event] = this[event].filter(e => e !== value)
            }
            case ("new_value"): {
                return this[event] = value
            }
        }
    }
}

module.exports = Dynamic_vars