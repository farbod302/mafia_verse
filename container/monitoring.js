var os = require('os-utils');
const online_users_handler = require('../socket/online_users_handler');

const monitoring = {
    init(socket) {
        this.socket = socket
        this.data = {
            online_games: 0,
            online_users: 0,
            ram_usage: 0,
            cpu_usage: 0
        }
        this.start_interval()
    },
    get_system_info() {
        os.cpuUsage((u) => { this.data.cpu_usage = u*100})
        this.data.ram_usage = (1 - os.freememPercentage()) * 100
    },

    get_users_info() {
        const online_users = online_users_handler.get_online_users()
        this.data.online_users = online_users.length
    },

    start_interval() {
        setInterval(() => {
            this.get_system_info()
            this.get_users_info()
            this.socket.to("monitoring").emit("new_data", { data: this.data })
            console.log(this.data);
        }, 3000)
    }
}

module.exports = monitoring