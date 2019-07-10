const recipe = require('./recipe')
const fs = require('fs')
const util = require('util')
const readFileAsync = util.promisify(fs.readFile)
const vm = require('vm')
const path = require('path')

module.exports = (reporter, definition) => {
  definition.options.preview = definition.options.preview || {}
  if (reporter.options.office) {
    Object.assign(definition.options.preview, {}, reporter.options.office.preview)
  }

  reporter.extensionsManager.recipes.push({
    name: 'pptx',
    execute: recipe(reporter, definition)
  })

  reporter.documentStore.registerComplexType('PptxType', {
    templateAssetShortid: { type: 'Edm.String' }
  })

  reporter.documentStore.model.entityTypes['TemplateType'].pptx = { type: 'jsreport.PptxType' }

  reporter.beforeRenderListeners.insert({ before: 'templates' }, 'pptx', (req) => {
    if (req.template.recipe === 'pptx' && !req.template.name && !req.template.shortid && !req.template.content) {
    // templates extension otherwise complains that the template is empty
    // but that is fine for this recipe
      req.template.content = 'pptx placeholder'
    }
  })

  reporter.beforeRenderListeners.add('pptx', async (req) => {
    if (req.template.recipe === 'pptx') {
      let helpersScript

      if (reporter.execution) {
        helpersScript = reporter.execution.resource('pptx-helpers.js')
      } else {
        helpersScript = await readFileAsync(path.join(__dirname, '../', 'static', 'helpers.js'), 'utf8')
      }

      if (req.template.helpers && typeof req.template.helpers === 'object') {
      // this is the case when the jsreport is used with in-process strategy
      // and additinal helpers are passed as object
      // in this case we need to merge in child template helpers
        return vm.runInNewContext(helpersScript, req.template.helpers)
      }

      req.template.helpers = helpersScript + '\n' + (req.template.helpers || '')
    }
  })

  reporter.initializeListeners.add('pptx', () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        previewInOfficeOnline: definition.options.previewInOfficeOnline,
        showOfficeOnlineWarning: definition.options.showOfficeOnlineWarn
      })
    }
  })
}
