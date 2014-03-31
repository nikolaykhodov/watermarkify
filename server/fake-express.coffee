express = require 'express'

class FakeExpress
  constructor: () ->
    instance = express()
    methods = (prop for prop of instance when typeof instance[prop] is 'function')

    @queue = []
    @post = () ->
      @queue.push
        method: 'post'
        args: arguments

    @config = () ->
      @queue.push
        method: 'config'
        args: arguments

    @get = () ->
      @queue.push
        method: 'get'
        args: arguments

    @put = () ->
      @queue.push
        method: 'put'
        args: arguments

    @del = () ->
      @queue.push
        method: 'del'
        args: arguments

    @__apply = (app) ->
      for entry in @queue
        app[entry.method].apply(app, entry.args)

module.exports = () ->
  new FakeExpress()
