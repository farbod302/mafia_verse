const spin = () => {
    let range = [
        {
            start: 0,
            end: 1
        },
        {
            start: 1.1,
            end: 100
        },

    ]

    let rand = Math.floor(Math.random() * 100)
    let selected_renge = range.find(r => r.start <= rand && r.end >= rand)
    return selected_renge.start ? true : false
}

module.exports = spin