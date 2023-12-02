var os = require('os-utils');


const monitoring={
    init(socket){
        this.socket=socket
        this.data={
            online_games:0,
            online_users:0,
            ram_usage:0,
            cpu_usage:0
        }
    },
    get_system_info(){
        os.cpuUsage((u)=>{this.data.cpu_usage=u})
        this.r
    }
}