process.env.NTBA_FIX_319 = 1;

//підключення фреймворку, та допоміжних файлів 
const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const config = require('./src/config')
const helper = require('./src/helper')
const keyboard = require('./src/keyboard')
const keyboardButtons = require('./src/k-buttons')
const database = require('./cards.json')

//обробка інлайн клавіатури
const ACTION_TYPE = {
  TOGGLE_BAG_CARD: 'tbc'
}

helper.logStart()

//підключення бази даних
mongoose.connect(config.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err))

//підключення моделей
require('./src/models/card.model')
require('./src/models/user.model')

const Card = mongoose.model('cards')
const User = mongoose.model('users')

//===========================================================
//створюємо бот
const bot = new TelegramBot(config.TOKEN, {
  polling: true
})

//??
bot.on('message', msg => {

  const chatId = helper.getChatId(msg)

  switch (msg.text) {
    case keyboardButtons.home.inline:
      bot.sendMessage(chatId, `Виберіть категорію товару`, {
        reply_markup: { keyboard: keyboard.inline }
      })
      break
    case keyboardButtons.inline.valentine:
      sendCardsByQuery(chatId, { category: 'valentine' })
      break
    case keyboardButtons.inline.powder:
      sendCardsByQuery(chatId, { category: 'powder' })
      break
    case keyboardButtons.inline.office:
      sendCardsByQuery(chatId, { category: 'office' })
      break
    case keyboardButtons.home.bag:
      showBagCards(chatId, msg.from.id)
      break
    case keyboardButtons.back:
      bot.sendMessage(chatId, `Що бажаєте придбати?`, {
        reply_markup: {
          keyboard: keyboard.home,
          resize_keyboard: true
        }
      })
      break
  }
})

bot.on('callback_query', query => {
  const userId = query.from.id
  let data
  try {
    data = JSON.parse(query.data)
  } catch (e) {
    throw new Error('Data is not an object')
  }

  const { type } = data
  if (type === ACTION_TYPE.TOGGLE_BAG_CARD) {
    toggleBagCard(userId, query.id, data)
  }
})

//привітальне повідомлення
bot.onText(/\/start/, msg => {
  const text = `Привіт, ${msg.from.first_name} ! Тебе вітає магазин Matrolix!\n\nВ нас ти можеш придбати круті аксесуари, та подаруночки для своїх близьких людей 🎁\n\nНавігація магазину знаходиться трішки нижче Якщо виникнуть запитання по роботі бота або потрібна буде консультація по асортименту - клікай по кнопці "Звязатись з менеджером"🙋🏻‍♀️`

  //Основне меню
  bot.sendMessage(helper.getChatId(msg), text, {
    reply_markup: {
      keyboard: keyboard.home,
      resize_keyboard: true
    }
  })
})

//Детальне зображення картки
bot.onText(/\/f(.+)/, (msg, [source, match]) => {
  const cardId = helper.getItemId(source)
  const chatId = helper.getChatId(msg)

  Promise.all([
    Card.findOne({ _id: cardId }),
    User.findOne({ telegramId: msg.from.id })
  ]).then(([cards, users]) => {

    let isBag = false

    if (users) {
      isBag = users.card.indexOf(cards._id) !== -1
    }

    const bagText = isBag ? 'Видалити з кошика' : 'Додати у кошик'

    const caption = `Назва: ${cards.name}\nЦіна: ${cards.price}\nОпис товару: ${cards.product_descr}`

    //Налаштування інлайн-клавіатури
    bot.sendPhoto(chatId, cards.picture, {
      caption: caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: bagText,
              callback_data: JSON.stringify({
                type: ACTION_TYPE.TOGGLE_BAG_CARD,
                cardId: cards._id,
                isBag: isBag
              })
            }
          ],
          [
            {
              text: 'Замовити зараз!',
              url: 'https://t.me/matrolya'
            }
          ]
        ]
      }
    })
  }).catch(e => console.log(e))
})

//допоміжні функції

//всі картки в категорії
function sendCardsByQuery(chatId, query) {
  Card.find(query).then(cards => {
    const html = cards.map((f, i) => {
      return `<b>${i + 1}</b> ${f.name} - ${f.price} /f${f._id}`
    }).join('\n')
    sendHTML(chatId, html, 'cards')
  })
}

//helper. send bot html
function sendHTML(chatId, html, keyboardButtonsName = null) {
  const options = {
    parse_mode: 'HTML'
  }
  if (keyboardButtonsName) {
    options['reply_markup'] = {
      keyboard: keyboard[keyboardButtonsName]
    }
  }

  bot.sendMessage(chatId, html, options)
}

//додавання та видалення з кошику
function toggleBagCard(userId, queryId, { cardId, isBag }) {
  let userPromise

  User.findOne({ telegramId: userId })
    .then(user => {
      if (user) {
        if (isBag) {
          user.cards = user.card.filter(cId => cId !== cardId)
        } else {
          user.card.push(cardId)
        }
        userPromise = user
      } else {
        userPromise = new User({
          telegramId: userId,
          cards: [cardId]
        })
      }

      const answerText = isBag ? 'Видалено' : 'Додано до кошика'

      userPromise.save().then(_ => {
        bot.answerCallbackQuery(queryId, {
          callback_query_id: queryId,
          text: answerText
        })
      }).catch(err => console.log(err))
    })
}

//кошик
function showBagCards(chatId, telegramId) {
  User.findOne({ telegramId })
    .then(user => {
      if (user) {
        Card.find({ _id: { '$in': user.card } }).then(card => {
          let html

          if (card.length) {
            html = card.map(c => {
              return `${c.name} - <b>${c.price}</b>`
            }).join('\n')
            html = `<b>Товари у кошику:</b>\n${html}`
          } else {
            html = 'Додайте товар до кошика'
          }

          sendHTML(chatId, html, 'home')
        })
      } else {
        sendHTML(chatId, 'Додайте товар до кошика', 'home')
      }
    }).catch(e => console.log(e))
}

