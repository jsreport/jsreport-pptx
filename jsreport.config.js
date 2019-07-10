const office = require('jsreport-office')

module.exports = {
  'name': 'pptx',
  'main': 'lib/pptx.js',
  'optionsSchema': office.extendSchema('pptx', {}),
  'dependencies': []
}
