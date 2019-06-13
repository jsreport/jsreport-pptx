/* eslint no-unused-vars: 1 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
;(function (global) {
  const Handlebars = require('handlebars')

  global.pptxList = function (data, options) {
    return Handlebars.helpers.each(data, options)
  }

  global.pptxSlides = function (data, options) {
    return Handlebars.helpers.each(data, options)
  }
})(this)
