'use strict';

/* Controllers */

angular.module('myApp.controllers', ['myApp.services']).
  controller('HomeCtrl', ['$scope', function($scope) {
  }])
  .controller('CreateUploadCtrl', ['$q', '$location', '$scope', 'api', function($q, $location, $scope, api) {
    var upload = new api.upload();

    upload.$create().then(function(response) {
      if(response.error === undefined) {
        ga('send', 'event',  'Uploads', 'New');
        $location.path('/upload/' + response.uploadId);
      } else {
        alert(response.error);
        $location.path('/home');
      }
    });
  }]).
  controller('CreateAlbumCtrl', ['$scope', '$rootScope', 'api', '$q', 'group', function($scope, $rootScope, api, $q, group) {
    $scope.createAlbum = function() {
      $scope.creating = true;
      var vk = new api.vk();
      vk.$createAlbum(this.title, this.description, group.gid, this.privacy, this.comment_privacy)
      .then(function(response) {
        $scope.$close(response.data);
      });
    };

  }])
  .controller('ChooseAlbumCtrl', ['$scope', '$rootScope', 'api', '$q', '$modal', function($scope, $rootScope, api, $q, $modal) {
    $scope.loadingGroups = true;
    $scope.loadingAlbums = true;

    $scope.album = $rootScope.chosenAlbum || {};
    $scope.group = $rootScope.chosenGroup || {};

    $scope.onGroupChanged = function(group) {
      if(!group || group.gid === undefined) {
        return;
      }

      $scope.group = group;

      $scope.loadingAlbums = true;
      vk.$albums(group.gid).then(function(response) {
        $scope.albums = response.data;
        $scope.loadingAlbums = false;
      });
    };

    $scope.selectGroupAlbum = function() {
      for(var i = 0; i < $scope.groups.length; i++) {
        var group = $scope.groups[i];
        if(group.gid === $scope.group.gid) {
          $scope.groups[i] = $scope.group;
        }
      }

      for(var i = 0; i < $scope.albums.length; i++) {
        var album = $scope.albums[i];
        if(album.aid === $scope.album.aid) {
          $scope.albums[i] = $scope.album;
        }
      }
    };

    $scope.createAlbum = function(group) {
      $modal.open({
        templateUrl: 'partials/create-album.html',
        controller: 'CreateAlbumCtrl',
        scope: $scope,
        resolve: {
          group: function() {
            return $scope.group;
          }
        }
      })
      .result.then(function(album) {
        if(!album) {
          return;
        }

        $scope.albums.push(album);
        $scope.album = album;
        $scope.selectGroupAlbum();

      });

    };

    var vk = new api.vk();
    $q.all([
      vk.$albums($scope.group.gid || ''),
      vk.$groups()
    ]).then(function(responses) {
      $scope.albums = responses[0].data;
      $scope.groups = responses[1].data;
      $scope.groups.unshift({
        name: '(No group)',
        gid: ''
      });

      $scope.loadingGroups = $scope.loadingAlbums = false;

      $scope.selectGroupAlbum();
    });
  }])
  .controller('UploadCtrl', ['manager', '$location', '$scope', '$rootScope', '$routeParams', 'config', '$q', 'api', 'renderer', '$modal', function(manager, $location, $scope, $rootScope, $routeParams, config, $q, api, renderer, $modal) {
    var preview;
    $scope.uploadId = $routeParams.uploadId;
    $scope.loading = true;
    $scope.previewImage = '';
    $scope.watermark = {};
    $scope.loggedIn = {};

    $scope.fonts = [
      'Arial',
      'Verdana',
      'Times',
      'Times New Roman',
      'Georgia',
      'Trebuchet MS',
      'Sans',
      'Comic Sans MS',
      'Courier New',
      'Webdings',
      'Garamond',
      'Helvetica',
      'Impact',
      'Days'
    ]

    $scope.removeImage = function(id) {
      $scope.manager.remove(id);
      ga('send', 'event',  'Uploads', 'RemoveImage');
    };

    $scope.rotateImage = function(id, direction) {
      $scope.manager.rotate(id, direction);
      ga('send', 'event',  'Uploads', 'RotateImage-' + direction);
    };

    $scope.manager = manager;
    $scope.onChooseImages = function(files) {
      function upload(index) {
        if(++index >= files.length) {
          return;
        }

        manager.uploadImage(files[index]).then(function() {
          setTimeout(function() {
            ga('send', 'event',  'Uploads', 'AddPhoto');
            upload(index);
          }, 10);
        });
      }

      upload(-1);
    };

    $scope.onChooseWatermark = function(files) {
      manager.uploadWatermark(files[0]);
    };

    $scope.showPreviewEditor = function() {
      $scope.preview_editor = true;

      /*
       * Preview sliders are hidden
       */
      // need to call updateDOM() of angular-slider
      setTimeout(function() {
        var evt = document.createEvent('UIEvents');
        evt.initUIEvent('resize', true, false,window,0);
        window.dispatchEvent(evt);
      }, 100);

      ga('send', 'event',  'Uploads', 'ShowPreviewEditor');
    };

    $scope.hidePreviewEditor = function() {
      $scope.preview_editor = false;

      ga('send', 'event',  'Uploads', 'HidePreviewEditor');
    };

    $scope.showPreview = function(imageUrl) {
      $scope.previewImage = imageUrl;
      $scope.preview = true;
      ga('send', 'event',  'Uploads', 'ShowPreview');
    };

    $scope.hidePreview = function() {
      $scope.preview = false;
      ga('send', 'event',  'Uploads', 'HidePreview');
    };

    $scope.renderImage = function(watermark, imageUrl) {
      var albumId = $scope.album.aid;
      var groupId = $scope.group.gid;

      return renderer
      .render($scope.watermark, imageUrl)
      .then(function(image) {
        ga('send', 'event',  'Uploads', 'Upload');
        console.log(image.length);
        var vk = new api.vk();
        return vk.$upload(image, albumId, groupId);
      });
    };

    $scope.uploadToVK = function() {
      if($scope.upload && $scope.upload.progress >= 0) {
        return alert('You should cancel the upload');
      }

      var watermark = _.extend($scope.watermark, {});
      var images = $scope.uploaded.concat([]);

      $scope.upload = {
        progress: 1
      };

      $scope.cancelUpload = false;

      function _upload(index) {
        if(++index >= images.length || $scope.cancelUpload === true) {
          $scope.cancelUpload = false;
          $scope.upload.progress = undefined;
          return;
        }

        $scope.upload.progress = Math.floor(index / images.length * 100);

        $scope.uploadImageToVK(watermark, images[index].url).
        then(function(response) {
          _upload(index);
        });
      }

      _upload(-1);
    };

    $scope.cancelUploadToVK = function() {
      $scope.upload = {};
      $scope.cancelUpload = true;
    };

    manager.init($scope.uploadId, $scope)
    .then(function() {
      if(!$scope.watermark || !$scope.watermark.text) {
        $scope.watermark = {
          text: 'Text...',
          color: '#ff0000',
          size: 20,
          opacity: 100,
          font: 'arial'
        };
      }
    })
    .then(function(response) {
      $scope.loading = false;
      $scope.loggedIn = response.data;
    })
    .catch(function(reason) {
      $scope.loading = false;
      alert(reason);
    });

    $scope.$watch('watermark', _.debounce(function(newValue) {
      if(!newValue) {
        return;
      }

      var watermark = new api.watermark({
        uploadId: $scope.uploadId
      });
      _.extend(watermark, newValue);
      watermark.$save();
    }, 100), true);

    $scope.saveAlbum = function() {
      localStorage.setItem('album', JSON.stringify({
        album: $scope.album,
        group: $scope.group
      }));
    };

    $scope.restoreAlbum = function() {
      var data = JSON.parse(localStorage.getItem('album'));

      if(data !== null && data.album !== undefined && data.group !== undefined) {
        $scope.album = data.album;
        $scope.group = data.group;
      }

      console.log($scope.album);
    };

    $scope.chooseAlbum = function() {
      if(!$scope.loggedIn || !$scope.loggedIn.vk) {
        return alert('You muste be authenticated in VK');
      }

      ga('send', 'event',  'Albums', 'Choose');

      /*
       * Pass chosen group/album to the modal dialog
       */
      if($scope.album !== undefined && $scope.group !== undefined) {
        $rootScope.chosenAlbum = $scope.album;
        $rootScope.chosenGroup = $scope.group;
      }

      $modal.open({
        templateUrl: 'partials/choose-album.html',
        scope: $scope,
        controller: 'ChooseAlbumCtrl'
      })
      .result.then(function(responses) {
        var album = responses[0],
            group = responses[1];

        $scope.album = album;
        $scope.group = group;

        $scope.saveAlbum();
      });
    };

    $scope.restoreAlbum();
  }]);
