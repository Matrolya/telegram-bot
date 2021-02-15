const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
  telegramId: {
    type: String,
    required: true
  },
  card: {
    type: [String],
    default: []
  }
})

mongoose.model('users', UserSchema)