require('should')
const jsreport = require('jsreport-core')
const fs = require('fs')
const path = require('path')
const util = require('util')
const textract = util.promisify(require('textract').fromBufferWithName)

describe('pptx', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      templatingEngines: {
        strategy: 'in-process',
        timeout: 999999999999999
      }
    }).use(require('../')())
      .use(require('jsreport-handlebars')())
      .use(require('jsreport-templates')())
      .use(require('jsreport-assets')())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('variable-replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'variable.pptx'))
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan Blaha')
  })

  it('slides', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Blaha')
    text.should.containEql('Boris')
  })

  it('list', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'list.pptx'))
          }
        }
      },
      data: {
        items: [{
          name: 'Jan'
        }, {
          name: 'Boris'
        }, {
          name: 'Pavel'
        }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')
  })
})