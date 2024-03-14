const helper = {
    shuffle_card(carts) {
        return carts
    },
    translate_side(side) {
        console.log({ sideee: side });
        switch (side) {
            case ("mafia"): return "مافیا"
            case ("citizen"): return "شهروند"
            case ("solo"): return "مستقل"
            default: return side
        }
    }
}

module.exports = helper