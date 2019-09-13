const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const extend = require('node.extend.without.arrays')
const { DOMParser, XMLSerializer } = require('xmldom')
const { decompress, response, serializeOfficeXmls } = require('jsreport-office')

module.exports = (reporter, definition) => async (req, res) => {
  if (!req.template.pptx || (!req.template.pptx.templateAsset && !req.template.pptx.templateAssetShortid)) {
    throw reporter.createError(`pptx requires template.pptx.templateAsset or template.pptx.templateAssetShortid to be set`, {
      statusCode: 400
    })
  }

  if (req.template.engine !== 'handlebars') {
    throw reporter.createError(`pptx recipe can run only with handlebars`, {
      statusCode: 400
    })
  }

  let templateAsset = req.template.pptx.templateAsset

  if (req.template.pptx.templateAssetShortid) {
    templateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.pptx.templateAssetShortid }, req)

    if (!templateAsset) {
      throw reporter.createError(`Asset with shortid ${req.template.pptx.templateAssetShortid} was not found`, {
        statusCode: 400
      })
    }
  } else {
    if (!Buffer.isBuffer(templateAsset.content)) {
      templateAsset.content = Buffer.from(templateAsset.content, templateAsset.encoding || 'utf8')
    }
  }

  const files = await decompress()(templateAsset.content)

  for (const f of files) {
    if (f.path.includes('.xml')) {
      f.doc = new DOMParser().parseFromString(f.data.toString())
      f.data = f.data.toString()
    }
  }

  await preprocess(files)

  const filesToRender = files.filter(f => f.path.includes('.xml'))
  const contentToRender = filesToRender
    .map(f => new XMLSerializer().serializeToString(f.doc).replace(/<pptxRemove>/g, '').replace(/<\/pptxRemove>/g, ''))
    .join('$$$docxFile$$$')

  reporter.logger.debug(`Starting child request to render pptx dynamic parts`, req)

  // delete _id, shortid, name to do an anonymous render
  const template = extend(true, {}, req.template, {
    _id: null,
    shortid: null,
    name: null,
    content: contentToRender,
    recipe: 'html'
  })

  const renderResult = await reporter.render({ template }, req)
  const contents = renderResult.content.toString().split('$$$docxFile$$$')
  for (let i = 0; i < filesToRender.length; i++) {
    filesToRender[i].data = contents[i]
    filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
  }

  await postprocess(files)

  for (const f of files) {
    if (f.path.includes('.xml')) {
      f.data = Buffer.from(new XMLSerializer().serializeToString(f.doc))
    }
  }

  await serializeOfficeXmls({ reporter, files, officeDocumentType: 'pptx' }, req, res)

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'pptx',
    stream: res.stream
  }, req, res)
}
