mongoose = require 'mongoose'

Schema = mongoose.Schema

ImgSchema = new Schema
  path: String

UploadSchema = new Schema
  startedAt:
    type: Date
    default: Date.now

  vkToken:
    type: String
    match: /^.{0,128}$/

  images: [ImgSchema]

  token:
    type: String
    match: /^.{0,128}$/

  watermark:
    text:
      type: String
      default: ''
      match: /^.{0,128}$/
    font:
      type: String
      default: ''
      match: /^.{0,128}$/
    size:
      type: Number
      default: 0
      min: 0
      max: 100
    position:
      type: Array
      default: []
      validate:
        validator: (values) ->
          for value in values
            if typeof value isnt 'number'
              return false

          return values.length is 2 or values.length is 0
    angle:
      type: Number
      default: 0
      min: 0
      max: 360
    color:
      type: String
      default: ''
      match: /^#[0-9a-f]{6}$/
    opacity:
      type: Number
      default: 100
      min: 0
      max: 100

Upload = mongoose.model 'uploads', UploadSchema

module.exports =
  Upload: Upload,
  UploadSchema: UploadSchema,
  ImgSchema: ImgSchema
