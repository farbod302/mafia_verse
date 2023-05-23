const run_timer=async (time,func)=>{
    await new Promise(resolve=>{setTimeout(resolve,time *1000)})
    func()
}


module.exports=run_timer