const { uid: uuid } = require("uid")
const static = require("../container/static")
const game_handler = require("./game_handler")
const games = {
    tv: {
        static_vars: require("../games/tv/static_vars")
    }
}



const find_match = {
    find_robot_game({ senario, client, db, socket }) {
        senario = senario || "tv"
        const  party_id  = client.idenity?.party_id
        if(!party_id)return
        client.to(party_id).emit("find_game_started", { user_started: client.idenity, senario })
        let s_party = db.getOne("party", "party_id", party_id)
        const { users } = s_party
        let party_players_count = users.length
        let seleced_game = games[senario]
        let game_players_count = seleced_game.static_vars.player_count
        let available_games = db.filterModel("games_queue", "senario", senario)
        let choosen_game = available_games.find(e => e.remain >= party_players_count)
        if (!choosen_game) {
            //create game queue
            let game_id = uuid(4)
            let new_game = {
                game_id,
                remain: game_players_count - party_players_count,
                users: users,
                partys: [party_id],
                senario
            }

            db.add_data("games_queue", new_game)
            socket.to(party_id).emit("find_match", { users: users.map(e => { return { avatar: `${static.url}/files/0.png` } }) })
            if (party_players_count === game_players_count) {
                this.create_game({game_id,db,socket})
            }
        }
        else {
            //join game
            let { users: already_joined, partys, remain, game_id } = choosen_game
            let new_users_list = already_joined.concat(users)
            let new_remain = remain - party_players_count
            let new_partys_list = partys.concat(party_id)
            let updated_game = {...choosen_game,
                users: new_users_list,
                remain: new_remain,
                partys: new_partys_list,
            }
            for (let party of new_partys_list) {
                socket.to(party).emit("find_match", { users: new_users_list.map(() => { return { avatar: `${static.url}/files/0.png` } }) })
            }
            db.replaceOne("games_queue", "game_id", game_id, updated_game)
            if (new_remain === 0) {
                this.create_game({game_id,db,socket})
            }
        }
    },


    async leave_find({ client,db,socket }) {
        const  party_id  = client.idenity?.party_id
        if(!party_id)return
        let all_games = db.getAll("games_queue")
        let party_to_leave = db.getOne("party", "party_id", party_id)
        let { users } = party_to_leave
        let users_ids = users.map(user => user.user_id)
        let game_to_leave = all_games.find(game => game.partys.includes(party_id))
        if (!game_to_leave) return
        let { users: users_befor_leave, partys, remain, game_id } = game_to_leave
        let users_after_leave = users_befor_leave.filter(user => !users_ids.includes(user.user_id))
        let new_party_lists = partys.filter(party => party !== party_id)
        let new_remain = remain + users.length
        let updated_game = {
            game_id,
            users: users_after_leave,
            remain:new_remain,
            partys:new_party_lists
        }
        //remove game if its empty
        if(updated_game.users.length === 0){
            db.removeOne("games_queue","game_id",game_id)
        }else{
            db.replaceOne("games_queue", "game_id", game_id, updated_game)
        }
        for (let party of partys) {
           socket.to(party).emit("join_status", { users:users_after_leave.map(()=>{return {avatar:`${static.url}/files/0.png`}}) })
        }
       socket.to(party_id).emit("find_stop")

    },


    async create_game({game_id,db,socket}) {
        game_handler.create_game({game_id,db,socket})
    }
}

module.exports = find_match