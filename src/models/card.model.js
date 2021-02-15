//Підключення БД
const mongoose = require('mongoose')
//створення схеми
const Schema = mongoose.Schema

//створення схеми карточок товарів
const CardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  product_descr: {
    type: String
  },
  picture: {
    type: String
  },
  category: {
    type: [String],
    default: []
  }
})

//cтворення моделі карточок товарів
mongoose.model('cards', CardSchema)
