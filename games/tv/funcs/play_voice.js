const _play_voice = {

    voice_list: [
        {
            voice_id: "intro",
            voices: [
                "intro"
            ]
        },
        {
            voice_id: "next",
            voices: [
                "next_1",
                "next_2",
                "next_3",
            ]
        },
        {
            voice_id: "day_sleep",
            voices: [
                "day_sleep",
            ]
        },
        {
            voice_id: "mafia_visit",
            voices: [
                "mafia_visit",
            ]
        },
        {
            voice_id: "next_day",
            voices: [
                "day_1",
                "day_2",
                "day_3",
            ]
        },
        {
            voice_id: "to_vote",
            voices: [
                "to_vote"
            ]
        },
        {
            voice_id: "vote_to",
            voices: [
                "vote_to_1",
                "vote_to_2",
                "vote_to_3",
                "vote_to_4",
                "vote_to_5",
                "vote_to_6",
                "vote_to_7",
                "vote_to_8",
                "vote_to_9",
                "vote_to_10",
                "vote_to_11",
            ]
        },
        {
            voice_id: "exit_vote_to",
            voices: [
                "exit_vote_to_1",
                "exit_vote_to_2",
                "exit_vote_to_3",
                "exit_vote_to_4",
                "exit_vote_to_5",
                "exit_vote_to_6",
                "exit_vote_to_7",
                "exit_vote_to_8",
                "exit_vote_to_9",
                "exit_vote_to_10",
                "exit_vote_to_11",
            ]
        },
        {
            voice_id: "mafia_think",
            voices: [
                "mafia_think",
            ]
        },
        {
            voice_id: "godfather_chosen",
            voices: [
                "godfather_chosen",
            ]
        },
        {
            voice_id: "announce_natoe",
            voices: [
                "announce_natoe",
            ]
        },
        {
            voice_id: "announce_natoe",
            voices: [
                "announce_natoe",
            ]
        },
        {
            voice_id: "act_time",
            voices: [
                "act_time",
            ]
        },
        {
            voice_id: "moved_out",
            voices: [
                "moved_out_1",
                "moved_out_2",
                "moved_out_3",
                "moved_out_4",
                "moved_out_5",
                "moved_out_6",
                "moved_out_7",
                "moved_out_8",
                "moved_out_9",
                "moved_out_10",
                "moved_out_11",
            ]
        },
        {
            voice_id: "need_inquiry",
            voices: [
                "need_inquiry",
            ]
        },
        {
            voice_id: "day_gun",
            voices: [
                "day_gun",
            ]
        },
        {
            voice_id: "defence_speech",
            voices: [
                "defence_speech",
            ]
        },
        {
            voice_id: "guard_hostage_taker_act_time",
            voices: [
                "guard_hostage_taker_act_time",
            ]
        },
        {
            voice_id: "guard_hostage_taker_act_time",
            voices: [
                "guard_hostage_taker_act_time",
            ]
        },



    ],


    play_voice(event, index) {
        console.log({index});
        const voice = this.voice_list.find(e => e.voice_id === event)
        const { voices } = voice
        if (voices.length === 1) return voices[0]
        if (index) return voices[index]
        const random_index = Math.floor(Math.random() * voices.length)
        return voices[random_index]
    }

}

module.exports=_play_voice