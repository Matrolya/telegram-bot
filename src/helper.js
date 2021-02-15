module.exports = {
  logStart() {
    console.log('log has been started');
  },

  getChatId(msg) {
    return msg.chat.id
  },

  getItemId(source) {
    return source.substr(2, source.length)
  }
}