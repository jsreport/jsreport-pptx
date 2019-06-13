const removeTagsPlaceholders = require('./removeTagsPlaceholders')
const slides = require('./slides')

module.exports = (files) => {
  slides(files)
  removeTagsPlaceholders(files)
}
