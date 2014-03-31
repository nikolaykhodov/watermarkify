config = require './config'
models = require './models'
fakeExpress = require './fake-express'

fs = require 'fs'
q = require 'q'
vkontakte = require 'vkontakte'
temp = require 'temp'
http = require 'http'
needle = require 'needle'
mime = require 'mime'

app = fakeExpress()

app.post '/api/vk/upload', (req, res) ->
  albumId = parseInt(req.body.albumId)
  groupId = parseInt(req.body.groupId) or ''

  accessToken = req.session.passport?.user?.accessToken or ''
  if process.env.TESTING is '1'
    accessToken = config.vk.debugAccessToken
  vk = vkontakte accessToken

  imageContent = req.body?.image or ''
  contentType = imageContent.match(/^data:([^;]{0,30});/)?[1] or 'image/png'
  imageContent = imageContent.replace /^data:image\/[a-z]+;base64,/, ''
  vkImage = new Buffer(imageContent, 'base64')

  params =
    album_id: albumId

  if !isNaN groupId
    params.group_id = groupId

  q.nfcall(vk, 'photos.getUploadServer', params)
  .then (response) ->
    console.log "vkImage.length=#{vkImage.length}"
    data =
      file1:
        buffer: vkImage
        content_type: contentType
        filename: 'file1.' + contentType.replace('image/', '')

    return q.ninvoke(needle, 'post', response.upload_url, data, {multipart: true})

  .then (response, body) ->
    resData = JSON.parse response[0].body

    params =
      album_id: albumId
      server: resData.server
      photos_list: resData.photos_list
      hash: resData.hash

    if !isNaN groupId
      params.group_id = groupId

    return q.nfcall(vk, 'photos.save', params)

  .then (response) ->
    res.json
      path: "http://vk.com/photo#{response[0].owner_id}_#{response[0].pid}"

  .fail (reason) ->
    res.json
      error: reason.message

  .done()

app.get '/api/vk/albums', (req, res) ->
  query = {}
  groupId = parseInt(req.query.groupId)
  if !isNaN(groupId)
    query =
      owner_id: -groupId

  accessToken = req.session.passport?.user?.accessToken or ''
  if process.env.TESTING is '1'
    accessToken = config.vk.debugAccessToken
  vk = vkontakte accessToken

  q.nfcall(vk, 'photos.getAlbums', query)
  .then (response) ->
        res.json response

    ,(reason) ->
      return res.json
        error: reason

  .fail (reason) ->
    return res.json
      error: reason.message

  .done()

app.post '/api/vk/createAlbum', (req, res) ->
  accessToken = req.session.passport?.user?.accessToken or ''
  if process.env.TESTING is '1'
    accessToken = config.vk.debugAccessToken
  vk = vkontakte accessToken

  groupId = parseInt req.body.group_id
  request = 
    title: req.body?.title or ''
    description: req.body?.description or ''
    comment_privacy: parseInt(req.body?.comment_privacy) or 0
    privacy: parseInt(req.body?.privacy) or 0

  if isNaN(groupId) is false and groupId > 0
    request.group_id = groupId

  q.nfcall(vk, 'photos.createAlbum', request)
  .then (response) ->
      res.json response

    ,(reason) ->
      return res.json
        err: reason

  .fail (reason) ->
    return res.json
      error: reason.message

  .done()

app.get '/api/vk/groups', (req, res) ->
  accessToken = req.session.passport?.user?.accessToken or ''
  if process.env.TESTING is '1'
    accessToken = config.vk.debugAccessToken
  vk = vkontakte accessToken

  q.nfcall(vk, 'groups.get',
    filter: 'editor'
    count: 1000
    extended: 1
  )
  .then (response) ->
      res.json response.slice(1)

    ,(reason) ->
      return res.json
        error: reason

  .fail (reason) ->
    return res.json
      error: reason.message

  .done()

module.exports = (_app) ->
  app.__apply(_app)
