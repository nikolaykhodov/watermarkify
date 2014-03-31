express = require 'express'
config = require '../../server/config.coffee'
models = require '../../server/models.coffee'
fs = require 'fs'

app = require('../../server/server.coffee').app

chai = require 'chai'
expect = chai.expect
request = require 'supertest'

describe 'API', () ->
  it '/GET /api/vk/groups', (done) ->
    request(app)
    .get('/api/vk/groups')
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err

      testGroups = (g for g in res.body when g.gid is 63800517)
      expect(testGroups.length).to.equal(1)
      expect(testGroups[0].name).to.equal('Watermarkify')

      done()

  it '/GET /api/vk/albums', (done) ->
    request(app)
    .get('/api/vk/albums')
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err

      albums = (a for a in res.body when a.aid is 150757342)
      expect(albums.length).to.equal(1)
      done()

  it '/GET /api/vk/albums?groupId=63800517', (done) ->
    request(app)
    .get('/api/vk/albums?groupId=63800517')
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err

      albums = res.body
      expect(albums.length).to.equal(4)
      done()

  it '/POST /api/vk/upload?albumId=150757342', (done) ->
    @timeout(100000)
    image = require('fs').readFileSync('test/server-specs/fixture/upload.png.base64').toString()
    request(app)
    .post('/api/vk/upload')
    .send
      image: image
      albumId: '150757342'
    .expect('Content-Type', /json/)
    .end (err, res) ->
      console.log "res.body = #{JSON.stringify(res.body)}"

      throw err if err?
      expect(res.body.path).to.contain('http://vk.com/')
      done()

  it '/POST /api/vk/upload?albumId=185013168&groupId=63800517', (done) ->
    @timeout(100000)
    image = require('fs').readFileSync('test/server-specs/fixture/upload.png.base64').toString()
    request(app)
    .post('/api/vk/upload')
    .send
      image: image
      albumId: '185013168'
      groupId: '63800517'
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err?
      expect(res.body.path).to.contain('http://vk.com/')
      done()

  it '/POST /api/vk/createAlbum', (done) ->
    request(app)
    .post('/api/vk/createAlbum')
    .send
      title: 'Test'
      description: 'Created from a Watermarkify unit test'
      # 3 - only me
      comment_privacy: 3
      # 3 - only me
      privacy: 3
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err?

      expect(res.body.aid).to.be.greaterThan(0)
      expect(res.body.title).to.equal 'Test'
      done()

  it '/POST /api/vk/createAlbum?groupId=63800517', (done) ->
    request(app)
    .post('/api/vk/createAlbum')
    .send
      title: 'Test'
      description: 'Created from a Watermarkify unit test'
      # 3 - only me
      comment_privacy: 3
      # 3 - only me
      privacy: 3
      group_id: 63800517
    .expect('Content-Type', /json/)
    .end (err, res) ->
      throw err if err?

      expect(res.body.aid).to.be.greaterThan(0)
      expect(res.body.title).to.equal 'Test'
      expect(res.body.owner_id).to.equal -63800517
      done()
