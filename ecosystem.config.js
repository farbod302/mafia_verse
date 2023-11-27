module.exports = {
    apps: [{
        name: "mafia",
        script: "index.js",
        // Delay between restart
        watch_delay: 1000,
        ignore_watch: ["node_modules","files","socket/online_users.json","socket/server_channel_msg/last_msgs.json","\\.git",".git"],
    }]
}