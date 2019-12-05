const util = require('util')
const { DOMParser, XMLSerializer } = require('xmldom')
const { decompress, saveXmlsToOfficeFile } = require('jsreport-office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML } = require('./utils')

module.exports = async function scriptPptxProcessing (inputs, callback, done) {
  const callbackAsync = util.promisify(callback)
  const { pptxTemplateContent, outputPath } = inputs
  let logs = []

  const renderCallback = async (content) => {
    const renderContent = await callbackAsync({
      content,
      // we send current logs to callback to keep correct order of
      // logs in request, after the callback is done we empty the logs again
      // (since they were added in the callback code already)
      logs
    }).then((r) => {
      logs = []
      return r
    }).catch((e) => {
      logs = []
      throw e
    })

    return renderContent
  }

  function log (level, ...args) {
    logs.push({
      timestamp: new Date().getTime(),
      level: level,
      message: util.format.apply(util, args)
    })
  }

  try {
    const files = await decompress()(pptxTemplateContent)

    for (const f of files) {
      if (contentIsXML(f.data)) {
        f.doc = new DOMParser().parseFromString(f.data.toString())
        f.data = f.data.toString()
      }
    }

    await preprocess(files)

    const filesToRender = files.filter(f => contentIsXML(f.data))

    const contentToRender = (
      filesToRender
        .map(f => new XMLSerializer().serializeToString(f.doc).replace(/<pptxRemove>/g, '').replace(/<\/pptxRemove>/g, ''))
        .join('$$$docxFile$$$')
    )

    log('debug', `Starting child request to render pptx dynamic parts`)

    const { content: newContent } = await renderCallback(contentToRender)
    const contents = newContent.split('$$$docxFile$$$')

    for (let i = 0; i < filesToRender.length; i++) {
      filesToRender[i].data = contents[i]
      filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
    }

    await postprocess(files)

    for (const f of files) {
      let isXML = false

      if (f.data == null) {
        isXML = f.path.includes('.xml')
      } else {
        isXML = contentIsXML(f.data)
      }

      if (isXML) {
        f.data = Buffer.from(new XMLSerializer().serializeToString(f.doc))
      }
    }

    await saveXmlsToOfficeFile({
      outputPath,
      files
    })

    log('debug', 'pptx successfully zipped')

    done(null, {
      logs,
      pptxFilePath: outputPath
    })
  } catch (e) {
    done(null, {
      logs,
      error: {
        message: e.message,
        stack: e.stack
      }
    })
  }
}
