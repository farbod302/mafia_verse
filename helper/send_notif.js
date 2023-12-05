var admin = require("firebase-admin");
var fcm = require('fcm-notification');
var serviceAccount = require("../notif_key.json");
const User = require("../db/user");
const certPath = admin.credential.cert(serviceAccount);
var FCM = new fcm(certPath);



const send_notif = async ({ users, msg, title }) => {
    let users_data = await User.find({ uid: { $in: users } })

    for (let user of users) {

        let s_user = users_data.find(e => e.uid == user)
        if(!s_user)continue
        let token = s_user?.notif_token
        if (!token || token === "not_fond") continue
        var message = {
            android: {
                priority: "high",
                notification: {
                    title: title,
                    body: msg,
                }
            },
            token
        };


        FCM.send(message, function (err, resp) {
            if (err) {
               console.log(err);
            } else {
                console.log('Successfully sent notification');
            }
        });
    }
}


module.exports=send_notif

