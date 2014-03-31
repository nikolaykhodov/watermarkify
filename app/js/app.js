'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'ngResource',
  'uiSlider',
  'colorpicker.module',
  'ui.bootstrap',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/home', {templateUrl: 'partials/home.html', controller: 'HomeCtrl'});
  $routeProvider.when('/createUpload', {templateUrl: 'partials/upload.html', controller: 'CreateUploadCtrl'});
  $routeProvider.when('/upload/:uploadId', {templateUrl: 'partials/upload.html', controller: 'UploadCtrl'});
  $routeProvider.otherwise({redirectTo: '/home'});
}]).
run(function($rootScope, $location) {
  $rootScope.$on('$routeChangeSuccess', function() {
    ga('send', 'pageview', $location.path());
  });
});
