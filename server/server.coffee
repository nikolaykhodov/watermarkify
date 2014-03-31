#!/usr/bin/env coffee

express = require 'express'
app = express()
config = require './config'
mongoose = require 'mongoose'
passport = require 'passport'

#
# DB
mongoose.connect config.mongoDB

# CORS middleware

allowCrossDomain = (req, res, next) ->
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')

  next()

passport.serializeUser (user, done) ->
  done null, user

passport.deserializeUser (user, done) ->
  done null, user

app.configure () ->

  app.use express.errorHandler
    dumpExceptions: true
    showStack: true

  app.use express.cookieParser()
  app.use express.bodyParser
    keepExtensions: true
    uploadDir: "#{__dirname}/../public/"
    limit: '30mb'

  app.use express.session
    secret: '123'

  app.use passport.initialize()
  app.use passport.session()

  app.use express.json()
  app.use express.multipart()
  app.use express.methodOverride()
  app.use allowCrossDomain

  app.use '/public', express.static "#{__dirname}/../public"
  app.use '/app', express.static "#{__dirname}/../app"

require('./api')(app)
require('./upload')(app)
require('./auth')(app)

app.get '/', (req, res) ->
  res.redirect '/app/'

app.listen 8001, '0.0.0.0', () ->
  console.log 'Listen on 8001 port...'

module.exports.app = app
