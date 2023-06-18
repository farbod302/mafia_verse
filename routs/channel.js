const express=require("express")
const router=express.Router()
const sha256=require("sha256")
const reject = require("../helper/reject_handler")
const { uid } = require("uid")
const ChannelToken = require("../db/channel_token")
const Channel = require("../db/channel")
const User = require("../db/user")
router.post("/generate_channel_token",(req,res)=>{
    const {user}=req.body
    const {password}=req.headers
    const password_hash=process.env.PASSWORD_HASH
    if(!password || sha256(password) !== password_hash)return reject(8,res)
    let token=uid(12)
    const new_chanel_token={
        token,
        user,
    }
    new ChannelToken(new_chanel_token).save()
    res.json({token})
})


const create_channel=(data)=>{new Channel(data).save()}

router.post("/create_channel_with_token",async (req,res)=>{
    const {channel_token}=req.body
    if(!req.body.user)return reject(9,res)
    let {uid:user_id}=req.body.user
    const {name}=req.body
    const id=uid(6)
    let new_channel={id,creator:user_id,name}
    let is_token_valid=await ChannelToken.findOne({token:channel_token,used:false,user:user_id})
    if(!is_token_valid)return reject(9,res)
    create_channel(new_channel)
    res.json({status:true,data:{},msg:""})
    await ChannelToken.findByIdAndUpdate({token:channel_token},{$set:{used:true,used_for:id}})

})


router.post("/can_create_channel",async (req,res)=>{
    if(!req.body.user)return reject(2,res)
    const {uid}=req.body
    let user=await User.findOne({uid})
    if(!user)return reject(2,res)
    const {own_channel,ranking}=user
    if(own_channel || ranking < 10000)return reject(10,res)
    res.json({status:true,data:{},msg:""})
})


router.post("/create_channel_by_user",async (req,res)=>{
    if(!req.body.user)return reject(2,res)
    const {uid}=req.body
    let user=await User.findOne({uid})
    const {own_channel,ranking}=user
    if(own_channel || ranking < 10000)return reject(10,res)
    const {name}=req.body
    let new_channel={name,creator:uid,id:uid(5)}
    create_channel(new_channel)
    res.json({status:true,data:{},msg:""})
})



module.exports=router