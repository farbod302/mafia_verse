module.exports = {
    apps: [{
        name: "mafia",
        script: "index.js",
        // Delay between restart
        watch_delay: 1000,
        ignore_watch: ["node_modules","files","socket/online_users.json"],
    }]
}