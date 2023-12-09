const run_timer=async (time,func)=>{
    await new Promise(resolve=>{setTimeout(resolve,time *1000)})
    try{
        func()
    }
    catch(err){
        console.log({err});
        return
    }
}


module.exports=run_timer