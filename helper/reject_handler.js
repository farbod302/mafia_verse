const errors = [
    "شماره تلفن نامعتبر است",
    "کد تایید نامعتبر است",
    "توکن نامعتبر است",
    "شناسه نامعتبر",
    "حسابی با این شماره تماس یا نام کاربری ثبت نشده",
    "کاربر یافت نشد",
    "درخواست دوستی قبلا ارسال شده",
    "این نام کاربری قبلا ثبت شده",
    "Invalid Password",
    "شناسه ساخت کانال نامعتبر است",
    "شما برای ساخت کانال باید به سطح ۱۰ برسید و فقط می توانید یک کانال بسازید",
    "شما قبلا درخواست عضویت به این کانال ارسال کرده اید",
    "شما درسترسی به این بخش ندارید"

]
const reject = (code, res) => {

    res.json({
        status: false,
        msg: errors[code],
        data: {}
    })

}

module.exports = reject