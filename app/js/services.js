'use strict';

/* Services */

angular.module('myApp.services', []).
  service('config', function() {
    var isLocalhost = ['localhost', '127.0.0.1'].indexOf(document.location.hostname) >= 0;
    return {
      API_HOST: 'http://' + document.location.hostname + (isLocalhost ? ':8001' : '') + '/api'
    };
  }).
  service('uploadXHR', ['$q', function($q) {
    return function(method, url, data) {
      var deferred = $q.defer();
      var self = this;

      function uploadProgress(event) {
        deferred.notify(event.loaded, event.total);
      }

      function uploadComplete(event) {
        deferred.resolve();
      }

      var fd = new FormData();
      for(var key in data) {
        fd.append(key, data[key]);
      }

      var xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', uploadProgress, false);
      xhr.addEventListener('load', uploadComplete, false);
      xhr.addEventListener('error', uploadComplete, false);
      xhr.addEventListener('abort', uploadComplete, false);

      xhr.open(method, url, true);
      xhr.send(fd);
    }
  }]).
  service('renderer', ['$q', function($q) {
    function render(watermark, image, deferred) {
      var canvasEl = document.createElement('canvas');
      var canvasWidth = canvasEl.width = image.getWidth();
      var canvasHeight = canvasEl.height = image.getHeight();

      var canvas = new fabric.Canvas(canvasEl);
      var position = watermark.position || [0, 0];
      var text = new fabric.Text(watermark.text || '');
      text.hasControls = text.hasBorders = false;
      text.setControlsVisibility({
        bl: false,
        br: false,
        mb: false,
        ml: false,
        mr: false,
        mt: false,
        tl: false,
        tr: false,
        mtr: false
      });

      text.adjustPosition('center');
      text.lockMovementX = true;
      text.lockMovementY = true;
      text.setText(watermark.text || '');
      text.setColor(watermark.color || '#000000');
      text.setAngle(watermark.angle || 0);
      text.setFontSize(watermark.size / 100 * canvasHeight);

      if(typeof watermark.font === 'string') {
        text.setFontFamily(watermark.font);
      }

      text.setOpacity(watermark.opacity / 100);
      text.setLeft(position[0] * canvasWidth);
      text.setTop(position[1] * canvasHeight);
      canvas.add(text);

      canvas.backgroundImage = image;

      canvas.setActiveObject(text);
      canvas.renderAll();
      canvas.calcOffset();

      deferred.resolve(canvas.toDataURL('image/jpeg'));
    }

    function start(watermark, imageUrl, callback) {
      var deferred = $q.defer();

      fabric.Image.fromURL(imageUrl, function(img) {
        render(watermark, img, deferred);
      });

      return deferred.promise;

    }

    return {
      render: start
    };
  }]).
  service('api', ['$resource', 'config', '$http', function($resource, config, $http) {
    return {
      upload: $resource(config.API_HOST + '/upload/:uploadId', {
        uploadId: '@uploadId'
      }, {
        'create': {method: 'POST', options: {uploadId: ''}},
        'get': {method: 'GET'}
      }),

      image: $resource(config.API_HOST + '/upload/:uploadId/image/:imageId', {
        uploadId: '@uploadId',
        imageId: '@imageId'
      }, {
        'remove': {method: 'DELETE'},
        'delete': {method: 'DELETE'},
        'rotateLeft': {method: 'POST', params: { method: 'rotate-left' }},
        'rotateRight': {method: 'POST', params: { method: 'rotate-right' }}
      }),

      watermark: $resource(config.API_HOST + '/upload/:uploadId/watermark', {
        uploadId: '@uploadId'
      }, {
        'set': {method: 'POST'}
      }),

      loggedIn: function() {
        return $http({
          method: 'GET',
          url: config.API_HOST + '/auth/loggedin',
        });
      }, 

      vk: function() {
        this.$upload = function(image, albumId, groupId) {
          return $http({
            method: 'POST',
            url: config.API_HOST + '/vk/upload',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
              var str = [];
              for(var p in obj) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              }
              return str.join("&");
            },
            data: {
              image: image,
              albumId: albumId,
              groupId: groupId
            }
          });
        };

        this.$albums = function(groupId) {
          return $http({
            method: 'GET',
            url: config.API_HOST + '/vk/albums?groupId=' + groupId,
          });
        };

        this.$createAlbum = function(title, description, group_id, privacy, comment_privacy) {
          return $http({
            method: 'POST',
            url: config.API_HOST + '/vk/createAlbum',
            data: {
              title: title,
              group_id: group_id,
              description: description,
              privacy: privacy,
              comment_privacy: comment_privacy
            }
          });
        };

        this.$groups = function() {
          return $http({
            method: 'GET',
            url: config.API_HOST + '/vk/groups',
          });
        };

      }
    };
  }]).
  service('manager', ['$q', '$location', 'api', 'config', 'renderer', 'uploadXHR', function($q, $location, api, config, renderer, uploadXHR) {
    var manager = {
      init: function(uploadId, scope) {
        this.uploadId = uploadId;
        this.scope = scope;

        var upload = new api.upload({
          uploadId: uploadId
        });

        return upload.$get().then(function(response) {
          if(response.error === 'Unknown upload') {
            return $location.path('/createUpload');
          }

          scope.uploaded = response.images;
          scope.watermark = response.watermark;
          scope.uploading = [];
        });
      },

      remove: function(imageId) {
        var img = new api.image({
          uploadId: this.uploadId,
          imageId: imageId
        });
        var self = this;
        return img.$remove().then(function(response) {
          self.scope.uploaded = self.scope.uploaded.filter(function(_img) {
            return _img._id !== imageId;
          });

          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });
      },

      rotate: function(imageId, direction) {
        var methods = {
          'left': '$rotateLeft',
          'right': '$rotateRight'
        };
        var method = methods[direction];

        var self = this;
        var _img = new api.image({
          uploadId: this.uploadId,
          imageId: imageId
        });

        return _img[method]().then(function(response) {
          var img = self.get('uploaded', imageId);

          var newUrl = img.url;
          if(newUrl.indexOf('?') > 0) {
            newUrl = newUrl.replace(/\?(.*)$/, '?' + Math.random());
          } else {
            newUrl = newUrl + '?' + Math.random();
          }

          img.url = newUrl;

          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });
      },

      find: function(array, id) {
        var images = this.scope[array];
        var image = images.filter(function(image) {
          return image._id === id;
        })[0];

        return images.indexOf(image);
      },

      get: function(array, id) {
        var images = this.scope[array];
        var index = this.find(array, id);
        return this.scope[array][index];
      },

      uploadImage: function(file) {
        var deferred = $q.defer();
        var timestamp = new Date().getTime();
        var self = this;

        function uploadProgress(event) {
          var index = self.find('uploading', timestamp);
          var image = self.scope.uploading[index];
          image.progress = event.loaded / event.total * 100;

          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        }

        function uploadComplete(event) {
          var response = {};
          try {
             response = JSON.parse(event.target.responseText);
          } catch(err) {
            deferred.reject(err);
          }

          if(response.error !== undefined) {
            console.error(response.error);
            deferred.reject(response.error);
          }

          var index = self.find('uploading', timestamp);
          var image = self.scope.uploading[index];
          self.scope.uploaded.splice(0, 0, {
            _id: response._id,
            url: response.url,
            timestamp: timestamp
          });
          self.scope.uploading.splice(index, 1); // remove i-th uploading image

          deferred.resolve();
        }

        var fd = new FormData();
        fd.append('file', file);

        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', uploadProgress, false);
        xhr.addEventListener('load', uploadComplete, false);
        xhr.addEventListener('error', uploadComplete, false);
        xhr.addEventListener('abort', uploadComplete, false);

        xhr.open('PUT', config.API_HOST +'/upload/' + this.uploadId + '/image', true);
        xhr.send(fd);

        this.scope.uploading.splice(0, 0, {
          name: file.name,
          progress: 0,
          _id: timestamp,
          timestamp: timestamp
        });

        this.scope.$apply();

        return deferred.promise.then(function() {
          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });
      },

      deleteWatermark: function() {
        var watermark = new api.watermark({
          uploadId: this.uploadId
        });
        var self = this;
        return watermark.$delete().then(function() {
          self.scope.watermarkUrl = '';

          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });
      },

      upload: {
        VK: function(image) {
          upload: function() {
          }
        }
      },

      uploadToVk: function(watermark, image) {
        var deferred = $q.defer();

        var self = this;

        function uploadProgress(event) {
        }

        function uploadComplete(event) {
          var response = {};
          try {
             response = JSON.parse(event.target.responseText);
          } catch(err) {
            deferred.reject(err);
          }

          if(typeof response.url === 'string') {
            deferred.resolve(response.status);
          } else {
            deferred.reject(response.error);
          }
        }

        var fd = new FormData();
        fd.append('image', image);

        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', uploadProgress, false);
        xhr.addEventListener('load', uploadComplete, false);
        xhr.addEventListener('error', uploadComplete, false);
        xhr.addEventListener('abort', uploadComplete, false);

        xhr.open('PUT', config.API_HOST + '/upload/' + this.uploadId + '/watermark', true);
        xhr.send(fd);

        return deferred.promise.then(function() {
          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });


        return deferred.promise;
      },

      uploadWatermark: function(file) {
        var deferred = $q.defer();
        var self = this;

        function uploadProgress(event) {
        }

        function uploadComplete(event) {
          var response = {};
          try {
             response = JSON.parse(event.target.responseText);
          } catch(err) {
            deferred.reject(err);
          }

          if(typeof response.url === 'string') {
            self.scope.watermarkUrl = response.url;
            deferred.resolve(response.url);
          } else {
            deferred.reject(response.error);
          }
        }

        var fd = new FormData();
        fd.append('file', file);

        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', uploadProgress, false);
        xhr.addEventListener('load', uploadComplete, false);
        xhr.addEventListener('error', uploadComplete, false);
        xhr.addEventListener('abort', uploadComplete, false);

        xhr.open('PUT', config.API_HOST + '/upload/' + this.uploadId + '/watermark', true);
        xhr.send(fd);

        return deferred.promise.then(function() {
          if(!self.scope.$$phase) {
            self.scope.$apply();
          }
        });
      }
    };

    return manager;
  }]);
  
