const cron = require('node-cron')
const crawler = require('./crawler')

cron.schedule('17 6,9,11-14,16,18,20 * * *', () => {
  crawler()
})
