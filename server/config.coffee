
module.exports = 
  mongoDB: 
    'mongodb://localhost:27017/watermarkify'
  staticHost: 
    'http://localhost:8001'
  vk:
    appId: 4093355
    appSecret: '8jWRXWLkpbpQUwrDd5VP'
    debugAccessToken: 'a01d66cad06256ac3f74c74e9d9aed7f1cfd7ec8f84d6f266e8041b7a165fcf69d690339714d2fbcaefb2d6aa9bf0'


if process.env.TESTING is '1'
  module.exports.mongoDB = 'mongodb://localhost:27017/testing'
