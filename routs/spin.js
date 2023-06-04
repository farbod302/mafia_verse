const spin = () => {
    let range = [
        {
            items: [],
            start: 0,
            end: 80
        },
        {
            items: ["bronz"],
            start: 80.1,
            end: 96
        },
        {
            items: ["silver"],
            start: 96.1,
            end: 99.7
        },
        {
            items: ["gold"],
            start: 99.8,
            end: 100
        },
    ]
    let chance = 0
    let bones = 0

    let rand = Math.random() * 100
    rand = +rand.toFixed(1)
    rand += (0.1 * bones)
    chance=Math.min(100,rand)
    let selected_renge = range.find(r => r.start <= chance && r.end >= chance)
    return selected_renge.items[0] || "null"

}
let items_list = {
    null: 0,
    bronz: 0,
    silver: 0,
    gold: 0
}
for (let i = 0; i < 100; i++) {
    let item = spin()
    items_list[item]++
}
console.log(items_list);