const express = require("express")
const router = express.Router()
const sha256 = require("sha256")
const reject = require("../helper/reject_handler")
const { uid: uuid } = require("uid")
const ChannelToken = require("../db/channel_token")
const Channel = require("../db/channel")
const User = require("../db/user")
const UserChannelConfig = require("../db/user_channel_config")
const online_users_handler = require("../socket/online_users_handler")
const Helper = require("../helper/helper")


router.post("/generate_channel_token", (req, res) => {
    const { user } = req.body
    const { password } = req.headers
    const password_hash = process.env.PASSWORD_HASH
    if (!password || sha256(password) !== password_hash) return reject(8, res)
    let token = uid(12)
    const new_chanel_token = {
        token,
        user,
    }
    new ChannelToken(new_chanel_token).save()
    res.json({ token })
})

const create_channel = (data) => { new Channel(data).save() }

router.post("/create_channel_with_token", async (req, res) => {
    const { channel_token } = req.body
    if (!req.body.user) return reject(9, res)
    let { uid: user_id } = req.body.user
    const { channel_name, channel_desc } = req.body
    const id = uuid(6)
    let new_channel = { id, creator: user_id, name: channel_name, desc: channel_desc, mod: [user_id] }
    let is_token_valid = await ChannelToken.findOne({ token: channel_token, used: false, user: user_id })
    if (!is_token_valid) return reject(9, res)
    create_channel(new_channel)
    res.json({ status: true, data: {}, msg: "" })
    await ChannelToken.findByIdAndUpdate({ token: channel_token }, { $set: { used: true, used_for: id } })

})


router.post("/can_create_channel", async (req, res) => {
    if (!req.body.user) return reject(2, res)
    const { uid } = req.body
    let user = await User.findOne({ uid })
    if (!user) return reject(2, res)
    const { own_channel, ranking } = user
    if (own_channel || ranking?.xp < 10000) return reject(10, res)
    res.json({ status: true, data: {}, msg: "" })
})


router.post("/create_channel_by_user", async (req, res) => {
    if (!req.body.user) return reject(2, res)
    const { uid } = req.body.user
    let user = await User.findOne({ uid })
    const { own_channel, ranking } = user
    if (own_channel || ranking?.xp < 10000) return reject(10, res)
    const { channel_name, channel_desc } = req.body
    let channel_id = uuid(5)
    let new_channel = {
        name: channel_name,
        creator: uid,
        id: channel_id,
        mod: [uid],
        desc: channel_desc,
        users: [uid],
        avatar: "files/0.png"
    }
    create_channel(new_channel)
    Helper.create_channel_config({ channel_id, user_id: uid })
    await User.findOneAndUpdate({ uid }, { $set: { own_channel: true }, $push: { chanels: channel_id } })
    res.json({ status: true, data: {}, msg: "" })
})

router.post("/join_request", async (req, res) => {
    if (!req.body.user) return reject(2, res)
    const { uid } = req.body.user
    const { channel_id } = req.body
    let s_channel = await Channel.findOne({ id: channel_id })
    if (s_channel.join_req.includes(uid) || s_channel.users.includes(uid)) return reject(11, res)
    const { public } = s_channel
    let key = !public ? "join_req" : "users"
    await Channel.findOneAndUpdate({ id: channel_id }, { $push: { [key]: uid } })
    if (public) {
        Helper.create_channel_config({ channel_id, user_id: uid })
    }
    if (public) {
        await User.findOneAndUpdate({ uid }, { $push: { chanels: channel_id } })
    }
    res.json({ status: true, msg: "درخواست شما ثبت شد", data: {} })

})

router.post("/my_channels", async (req, res) => {
    const uid = req.body.user?.uid
    if (!uid) return reject(3, res)

    const s_user = await User.findOne({ uid })
    const { chanels } = s_user
    let online_users = online_users_handler.get_online_users()
    let promisees = chanels.map(channel => {
        return new Promise(async resolve => {

            let s_channel = await Channel.findOne({ id: channel })
            let channel_config = await UserChannelConfig.findOne({ user_id: uid, channel_id: channel })
            const { last_visit } = channel_config
            const { messages, users } = s_channel
            let unread = messages.filter(e => e.msg_time > last_visit)
            let channel_online_users = users.filter(u => online_users.includes(u))
            resolve({
                ...channel_config._doc,
                channel_name: s_channel.name,
                channel_id: s_channel.id,
                channel_image: channel.avatar,
                members: users.length,
                unread_messages: unread.length,
                online_users: channel_online_users.length

            })

        })
    })

    let data = await Promise.all(promisees)
    data.sort((a, b) => b.pin_status - a.pin_status)
    res.json({
        status: true,
        data: data
    })

})


router.post("/specific_channel", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { uid: user_id } = user

    const { channel_id, paging } = req.body
    let channel_config = await UserChannelConfig.findOne({ user_id, channel_id })
    const { last_visit } = channel_config
    let s_channel = await Channel.findOne({ id: channel_id })
    const { users, cup, name, avatar, creator, mods, messages } = s_channel
    let data = {
        channel_name: name,
        channel_image: avatar,
        is_leader: user_id === creator,
        is_co_leader: mods.includes(user_id),
        channel_members: users.length,
        channel_cup: cup,
    }
    let s_messages = messages.filter(e => e.msg_time > last_visit)
    data["content"] = s_messages
    res.json({ status: true, data })
})


router.post("/search", async (req, res) => {
    const user = req.body.user
    let user_id = user.uid
    if (!user_id) return reject(3, res)
    const { channel_name } = req.body
    if (!channel_name) return res.json({ status: true, data: [] })
    let s_channels = await Channel.find({ name: { $regex: channel_name } })
    let clean_channels = s_channels.map(channel => {
        const { name, cup, avatar, desc, id, public, users } = channel
        return {
            channel_name: name,
            channel_id: id,
            channel_cup: cup,
            channel_image: avatar,
            channel_description: desc,
            public,
            users: users.length,
            is_member: users.includes(user_id)
        }
    })
    res.json({
        status: true,
        data: clean_channels
    })
})

router.post("/preview", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { channel_id } = req.body
    const { uid: user_id } = user
    let s_channel = await Channel.findOne({ id: channel_id })
    if (!s_channel) reject(3, res)
    const { name, avatar, cup, public, users, join_req } = s_channel
    let res_data = {
        channel_name: name,
        channel_image: avatar,
        channel_id,
        channel_members: users.length,
        channel_cup: cup,
        is_privet: !public,
        you_are_member: users.includes(user_id),
        join_request: join_req.includes(user_id)
    }
    res.json({
        status: true,
        msg: "",
        data: res_data
    })
})


router.post("/exit", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { channel_id } = req.body
    const { uid: user_id } = user
    await Channel.findOne({ id: channel_id }, { $pull: { users: user_id, mod: user_id } })
    res.json({
        status: true,
        msg: "درخواست ارسال شد"
    })
})


router.post("/online_game", async (req, res) => {
    const { channel_id } = req.body
    const s_channel = await Channel.findOne({ id: channel_id }, { games: 1 })
    res.json({ status: true, data: s_channel.games })
})


router.post("/online_game_pre_start_update", async (req, res) => {
    const { channel_id, game_id } = req.body
    const s_channel = await Channel.findOne({ id: channel_id }, { games: 1 })
    const { games } = s_channel
    let s_game = games.find(e => e.game_id === game_id)
    res.json({
        status: true,
        msg: "",
        data: s_game.users || []
    })

})


router.post("/kick_player", async (req, res) => {
    const user = req.body.user
    if (!user) return reject(3, res)
    const { channel_id, user_to_kick } = req.body
    let s_channel = await Channel.findOne({ id: channel_id })
    const { creator, mods } = s_channel
    let is_mod = [...creator, ...mods].includes(user.uid)
    if (!is_mod) return reject(4, res)
    await Channel.findOneAndUpdate({ id: channel_id }, { $pull: { users: user_to_kick, mod: user_to_kick } })
    res.json({
        status: true,
        msg: "",
        data: {}
    })
})


router.post("/promote_demote", async (req, res) => {

    const user = req.body.user
    if (!user) return reject(3, res)
    const { user_id, op } = req.body
    const { uid: creator } = req.body
    let key = op ? "$push" : "$pull"
    await Channel.findOneAndUpdate({ creator }, { [key]: { mods: user_id } })
    res.json({
        status: true,
        msg: "درخواست انجام شد",
        data: {}
    })

})

module.exports = router