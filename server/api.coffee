config = require './config'
models = require './models'
fakeExpress = require './fake-express'

fs = require 'fs'
hat = require 'hat'
path = require 'path'
mongoose = require 'mongoose'
gm = require 'gm'
q = require 'q'
exec = require('child_process').exec

app = fakeExpress()

app.get '/api/upload', (req, res) ->
  res.json
    error: '/api/upload is only accessible via a POST-request'

app.post '/api/upload', (req, res) ->
  upload = new models.Upload

  upload.save (err) ->
    if err?
      return res.json
        error: err
    res.json
      uploadId: upload.id

app.get '/api/upload/:uploadId', (req, res) ->
  models.Upload.findById req.params.uploadId, (err, upload) ->
    if err? or upload is null
      return res.json
        error: 'Unknown upload'

    res.json
      _id: upload.id,
      images: ({url: img.path, _id: img._id} for img in upload.images)
      watermark: upload.watermark

app.put '/api/upload/:id/image', (req, res) ->
  models.Upload.findById req.params.id, (err, upload) ->
    if err? or upload is null
      return res.json
        error: 'Unknown upload'

    filename = ''
    try
      filename = path.basename req.files.file?.path
    catch err
      console.error err
      return res.json
        error: err

    upload.images.unshift
      path: "/public/#{filename}"
    img = upload.images[0]

    upload.save (err) ->
      if err?
        return res.json
          error: err

      res.json
        _id: img.id
        url: img.path

app.post '/api/upload/:uploadId/image/:imageId', (req, res) ->
  method = req.query.method

  models.Upload.findById req.params.uploadId, (err, upload) ->
    if err? or upload is null
      return res.json
        error: 'Uknown upload'

    img = upload.images.id(req.params.imageId)
    if not img?
      return res.json
        error: 'Unknown image'

    imgPath = ".#{img.path}"
    switch method
      when 'rotate-right'
        gm(imgPath)
        .rotate('white', 90)
        .write imgPath, (err) ->
          if err?
            return res.json
              error: err
          res.json
            status: 'rotated'
      when 'rotate-left'
        gm(imgPath)
        .rotate('white', -90)
        .write imgPath, (err) ->
          if err?
            return res.json
              error: err
          res.json
            status: 'rotated'
      else
        res.json
          error: 'Unknown method'

app.del '/api/upload/:uploadId/image/:imageId', (req, res) ->
  models.Upload.findById req.params.uploadId, (err, upload) ->
    if err? or upload is null
      return res.json
        error: 'Uknown upload'

    img = upload.images.id(req.params.imageId)
    if not img?
      return res.json
        error: 'Unknown image'

    imgPath = "#{__dirname}/..#{img.path}"
    fs.unlink imgPath, (err) ->
      if err?
        return res.json
          error: err

      img.remove()
      upload.save (err) ->
        if err?
          return req.json
            error: err

        res.json
          status: 'deleted'

app.post '/api/upload/:uploadId/watermark', (req, res) ->
  q.ninvoke(models.Upload, 'findById', req.params.uploadId)
  .then (upload) ->
      if upload is null
        return res.json
          error: 'Unknown upload'

      upload.watermark.text = req.body.text if req.body.text?
      upload.watermark.font = req.body.font if req.body.font?
      upload.watermark.size = req.body.size if req.body.size?
      upload.watermark.angle = req.body.angle if req.body.angle?
      upload.watermark.color = req.body.color if req.body.color?
      upload.watermark.position = req.body.position if req.body.position?
      upload.watermark.opacity = req.body.opacity if req.body.opacity?

      upload.save (err) ->
        if err?
          return res.json
            error: err

        res.json
          status: 'saved'

    ,(reason) ->
      return res.json
        error: 'Unknown upload'
  .catch (err) ->
    return res.json
      error: err.message
  .done()

app.get '/api/upload/:uploadId/image/:imageId', (req, res) ->
  q.ninvoke(models.Upload, 'findById', req.params.uploadId)
  .then (upload) ->
      if upload is null
        return res.json
          error: 'Unknown upload'

      img = upload.images.id(req.params.imageId)
      if img is null
        return res.json
          error: 'Unknown image'

      if upload.watermark.text is ''
        return res.json
          error: 'There is no watermark text'

      imgPath = "./..#{img.path}"

      geometry = parseInt(100)
      angle = parseFloat(90.0)
      alpha = parseInt(50)
      command = [
        'gm',
        "#{__dirname}/#{imgPath}",
        '-'
      ]

      q.nfcall exec, command.join(' '),
        encoding: 'binary'
        maxBuffer: 5000 * 1024

    ,(reason) ->
      return res.json
        error: 'Unknown upload'
  .then (stdout, stderr) ->
    res.setHeader('Content-Type', 'image/jpeg')
    res.end stdout[0], 'binary'
  .catch (reason) ->
    return res.json
      error: reason.message
  .done()

module.exports = (_app) ->
  app.__apply _app
