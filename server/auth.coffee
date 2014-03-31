config = require './config'

passport = require 'passport'
VkStrategy = require('passport-vkontakte').Strategy
fakeExpress = require './fake-express'
app = fakeExpress()

passport.use new VkStrategy
  clientID: config.vk.appId,
  clientSecret: config.vk.appSecret,
  callbackURL: '/auth/vk/callback'
, (accessToken, refreshToken, profile, done) ->

  user =
    profile: profile
    accessToken: accessToken

  done null, user

app.get '/auth/vk/go', passport.authenticate('vkontakte',
  scope: ['groups', 'photos']
), (req, res) ->
  console.log '/auth/vk/go'

app.get '/auth/getback', (req, res) ->
  redirect = req.cookies.getback or '/'
  res.redirect redirect

app.get '/auth/vk/callback', passport.authenticate('vkontakte', {failureRedirect: '/auth/getback', successRedirect: '/auth/getback'})

app.get '/api/auth/loggedin', (req, res) ->
  res.json
    vk: req.session.passport?.user?.accessToken?.length > 0
    fb: false

app.get '/auth/logout', (req, res) ->
  req.session.destroy()
  req.logout()
  res.redirect req.cookies.getback or '/'

module.exports = (_app) ->
  app.__apply _app
