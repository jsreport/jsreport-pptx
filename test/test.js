require('should')
const jsreport = require('jsreport-core')
const fs = require('fs')
const path = require('path')
const util = require('util')
const { decompress } = require('jsreport-office')
const textract = util.promisify(require('textract').fromBufferWithName)
const { DOMParser } = require('xmldom')
const { nodeListToArray } = require('../lib/utils')

describe('pptx', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      templatingEngines: {
        strategy: 'in-process'
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
    // the parser somehow don't find the other items on the first run

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[2].getAttribute('id').should.be.eql('5001')
    sldIdEls[3].getAttribute('id').should.be.eql('5002')
  })

  it('slides when pptxSlide and other handlebars in the same a:t', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides_in_same_node.pptx'))
          }
        }
      },
      data: {
        list: [{ text: 'Jan' }, { text: 'Boris' }]
      }
    })

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[1].getAttribute('id').should.be.eql('5001')
  })

  it('slides with image', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides_with_image.pptx'))
          }
        }
      },
      data: {
        list: [{
          text: 'Jan',
          image1: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
        }, {
          text: 'Boris',
          image1: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
        }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[1].getAttribute('id').should.be.eql('5001')
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

  it('image', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image.pptx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
      }
    })

    const files = await decompress()(result.content)
    const slide = files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    slide.should.containEql('rId50001')
    slide.should.containEql('rId50002')
    fs.writeFileSync('out.pptx', result.content)
  })

  it('table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table.pptx'))
          }
        }
      },
      data: {
        people: [
          {
            name: 'Jan',
            email: 'jan.blaha@foo.com'
          },
          {
            name: 'Boris',
            email: 'boris@foo.met'
          },
          {
            name: 'Pavel',
            email: 'pavel@foo.met'
          }
        ]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Boris')
  })
})
