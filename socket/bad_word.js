const check_bad_words = {
    bad_words_list: "koskesh,jakesh,madar ghabe,nanato gaiidam,haroom zade,siktir,jende,koni,کسکش,خایه,داشاق,بگاد,کون,کونی,کیونی,شونبول,پفیوز,گایید,کس کش,جاکش,دیوث,جنده,قحبه,حروم,چاقال,کیر",
    check(txt) {
        const space_char = ["*", ".", "-", "_", "#"]
        for (let char of space_char) txt = txt.replaceAll(char, "")
        const bad_words_list = this.bad_words_list.split(",")
        bad_words_list.forEach(w => {
            const bad_word_index = txt.indexOf(w)
            if (bad_word_index === -1) return
            const text_to_replace = Array(w.length).fill("*").join("")
            txt=txt.replaceAll(w,text_to_replace)
        })
       return txt
    }
}

module.exports = check_bad_words