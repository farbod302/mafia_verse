module.exports = {
    apps: [{
      script: "index.js",
      watch: ["server"],
      // Delay between restart
      watch_delay: 1000,
      ignore_watch : ["node_modules", "client/img", "\\.git", "*.log","online_users.json"],
    }]
  }