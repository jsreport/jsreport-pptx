const concatTags = require('./concatTags')
const slides = require('./slides')
const list = require('./list')

module.exports = (files) => {
  concatTags(files)
  slides(files)
  list(files)
}
