const channel_socket_handler = {

    join_channel(data, socket, client) {
        const { channel_id } = data
        client.join(channel_id)
        client.idenity = { ...client.idenity, channel_id }
    },
    send_message(data, socket, client) {

    }


}

module.exports=channel_socket_handler