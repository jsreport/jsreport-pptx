const schema = {
  type: 'object',
  properties: {
    previewInOfficeOnline: { type: 'boolean' },
    publicUriForPreview: { type: 'string' },
    showOfficeOnlineWarning: { type: 'boolean', default: true }
  }
}
module.exports = {
  'name': 'pptx',
  'main': 'lib/pptx.js',
  'optionsSchema': {
    extensions: {
      pptx: { ...schema }
    }
  },
  'dependencies': []
}
