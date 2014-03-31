express = require 'express'
config = require '../../server/config.coffee'
models = require '../../server/models.coffee'
fs = require 'fs'

app = require('../../server/server.coffee').app

mongoose = require 'mongoose'
connection = mongoose.createConnection config.mongoDB
Upload = connection.model('uploads')

gm = require 'gm'
request = require 'supertest'
path = require 'path'
fs = require 'fs'
chai = require 'chai'
expect = chai.expect

describe 'API', () ->
  uploadId = ''
  imageId = ''
  imageFilename = ''
  imageUrl = ''

  it 'GET /', (done) ->
    request(app)
    .get('/')
    .expect(302)
    .expect('Location', '/app/')
    .end (err, res) ->
      expect(err).to.equal(null)
      done()

  it 'GET /api/upload', (done) ->
    request(app)
    .get('/api/upload')
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err
      expect(res.body.error).to.contain('is only accessible')
      done()

  it 'POST /api/upload', (done) ->
    request(app)
    .post('/api/upload')
    .expect(200)
    .end (err, res) ->
      throw err if err

      expect(res.body.uploadId).not.to.be.undefined
      uploadId = res.body.uploadId
      models.Upload.findById uploadId, (err, upload) ->

        expect(upload.watermark.text).to.equal('')
        done()

  it '/GET /api/upload/:uploadId', (done) ->
    request(app)
    .get("/api/upload/#{uploadId}")
    .expect(200)
    .end (err, res) ->
      throw err if err

      expect(res.body.images).to.deep.equal([])
      expect(res.body._id).to.equal(uploadId)
      expect(res.body.watermark.text).to.equal('')

      done()

  it 'PUT /api/upload/<invalid id>/image', (done) ->
    request(app)
    .put('/api/upload/invalid_id/image')
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err

      expect(res.body.error).to.equal('Unknown upload')
      done()

  it '/PUT /api/upload/<valid_id>/image', (done) ->
    request(app)
    .put("/api/upload/#{uploadId}/image")
    .attach('file', "#{__dirname}/fixture/base.jpg")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err

      expect(res.body._id).not.to.be.undefined

      imageId = res.body._id
      imageUrl = res.body.url
      imageFilename = imageUrl.replace config.staticHost, ''
      imageFilename = ".#{imageFilename}"

      expect(fs.existsSync imageFilename).to.equal(true)
      done()

  it '/PUT /api/upload/<valid_id>/image (unique URL for an image)', (done) ->
    request(app)
    .put("/api/upload/#{uploadId}/image")
    .attach('file', "#{__dirname}/fixture/base.jpg")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err

      expect(res.body._id).not.to.be.undefined
      expect(res.body.url).not.to.be.undefined

      expect(res.body._id).not.to.equal(imageId)
      expect(res.body.url).not.to.equal(imageUrl)
      done()

  it '/POST /api/upload/<valid_id>/image/<img_valid>?method=rotate-right', (done) ->
    request(app)
    .post("/api/upload/#{uploadId}/image/#{imageId}?method=rotate-right")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      expect(res.body.status).to.equal('rotated')

      gm(imageFilename)
      .size (err, value) ->
        expect(value.width).to.equal(1024)
        expect(value.height).to.equal(768)
        done()

  it '/POST /api/upload/<valid_id>/image/<img_valid>?method=rotate-left', (done) ->
    request(app)
    .post("/api/upload/#{uploadId}/image/#{imageId}?method=rotate-left")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      expect(res.body.status).to.equal('rotated')

      gm(imageFilename)
      .size (err, value) ->
        expect(value.width).to.equal(768)
        expect(value.height).to.equal(1024)
        done()

  it '/POST /api/upload/<valid_id>/image/<img_valid>?method=unknown-method', (done) ->
    request(app)
    .post("/api/upload/#{uploadId}/image/#{imageId}?method=unknown-method")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      expect(res.body.error).to.equal('Unknown method')
      done()

  it '/POST /api/upload/<valid_id>/watermark', (done) ->
    request(app)
    .post("/api/upload/#{uploadId}/watermark")
    .expect(200)
    .expect('Content-Type', /json/)
    .send
      text: 'sample'
      font: 'font'
      size: 1,
      position: [1,2]
      angle: 90
      color: '#ffffff'
      opacity: 50
    .end (err, res) ->
      throw err if err?
      expect(res.body.status).to.equal('saved')

      Upload.findById uploadId, (err, upload) ->
        throw err if err?
        d = upload.watermark

        expect(d.text).to.equal('sample')
        expect(d.font).to.equal('font')
        expect(d.size).to.equal(1)
        expect(d.position).not.to.be.empty
        expect(d.angle).to.equal(90)
        expect(d.color).to.equal('#ffffff')
        expect(d.opacity).to.equal(50)

        done()

  it '/POST /api/upload/<invalid_id>/watermark', (done) ->
    request(app)
    .post("/api/upload/invalid_id/watermark")
    .expect(200)
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err?

      expect(res.body.error).to.equal('Unknown upload')
      done()

  it '/GET /api/upload/<valid_id>/image/<img_valid_id>', (done) ->
    request(app)
    .get("/api/upload/#{uploadId}/image/#{imageId}")
    .expect('Content-Type', /jpeg/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      done()

  it '/GET /api/upload/<invalid_id>/image/<img_valid_id>', (done) ->
    request(app)
    .get("/api/upload/invalid_id/image/#{imageId}")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      expect(res.body.error).to.equal('Unknown upload')
      done()

  it '/GET /api/upload/<valid_id>/image/<img_invalid_id>', (done) ->
    request(app)
    .get("/api/upload/#{uploadId}/image/<img_invalid_id>")
    .expect('Content-Type', /json/)
    .expect(200)
    .end (err, res) ->
      throw err if err?
      expect(res.body.error).to.equal('Unknown image')
      done()

  it '/GET /api/upload/:uploadId (after uploading an image)', (done) ->
    request(app)
    .get("/api/upload/#{uploadId}")
    .expect(200)
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err?

      expect(res.body.images.length).to.equal(2)
      expect(res.body.images[0].url).not.to.be.undefined
      expect(res.body.images[0]._id).not.to.be.undefined

      done()

  it '/GET /api/upload/<valid_id>/image/<img_valid_id> (no watermark text)', (done) ->
    request(app)
    .post("/api/upload/#{uploadId}/watermark")
    .send
      text: ''
    .end (err, res) ->
      throw err if err?

      request(app)
      .get("/api/upload/#{uploadId}/image/#{imageId}")
      .expect('Content-Type', /json/)
      .expect(200)
      .end (err, res) ->
        throw err if err?
        expect(res.body.error).to.equal('There is no watermark text')
        done()

  it '/DELETE /api/upload/<valid_id>/image/<img_valid_id>', (done) ->
    request(app)
    .del("/api/upload/#{uploadId}/image/#{imageId}")
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err

      expect(fs.existsSync imageFilename).to.equal(false)
      expect(res.body.error).to.be.undefined
      expect(res.body.status).to.equal('deleted')

      Upload.findById uploadId, (err, upload) ->
        img = upload.images.id(imageId)
        expect(img).to.equal(null)
        done()

