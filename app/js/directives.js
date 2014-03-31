'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('imageWatermark', function() {

    return {
      restrict: 'A',

      compile: function(el, attrs, transclude) {
        var canvas, 
            text, 
            $scope, 
            canvasHeight, 
            canvasWidth,
            watermark,
            imageUrl;

        function render(value, imageUrl) {
          fabric.Image.fromURL(imageUrl, function(img) {
            var position = value.position || [0, 0];
            if(text) {
              canvas.remove(text);
            }
            text = new fabric.Text(value.text || '');
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

            text.hasControls = text.hasBorders = false;
            text.adjustPosition('center');
            text.lockMovementX = true;
            text.lockMovementY = true;
            text.setText(value.text || '');
            text.setColor(value.color || '#000000');
            text.setAngle(value.angle || 0);
            text.setFontSize(value.size / 100 * canvasHeight);

            if(typeof value.font === 'string') {
              text.setFontFamily(value.font);
            }

            text.setOpacity(value.opacity / 100);
            text.setLeft(position[0] * canvasWidth);
            text.setTop(position[1] * canvasHeight);
            canvas.add(text);

            img.setScaleX(canvasWidth / img.getWidth());
            img.setScaleY(canvasHeight / img.getHeight());
            canvas.backgroundImage = img;

            canvas.setActiveObject(text);
            canvas.renderAll();
            canvas.calcOffset();
          });
        }

        return function(scope, element, attrs, ngModel) {
          canvas = new fabric.Canvas(el[0]);
          canvasHeight = canvas.getHeight();
          canvasWidth = canvas.getWidth();

          $scope = scope;
          $scope.$watch(attrs.imageUrl, function(newImageUrl) {
            if(!newImageUrl) {
              return;
            }

            render($scope[attrs.watermark], $scope[attrs.imageUrl]);
          });
        }
      }
    };
  })

  .directive('textWatermark', function() {

    return {
      restrict: 'A',
      require: '?ngModel',

      compile: function(el, attrs, transclude) {
        var canvas, text, modelValue, $scope, canvasHeight, canvasWidth;

        function render(value) {
          if(!text) {
            text = new fabric.Text(value.text || '');
            text.setControlsVisibility({
              bl: false,
              br: false,
              mb: false,
              ml: false,
              mr: false,
              mt: false,
              tl: false,
              tr: false,
              mtr: true
            });
            text.adjustPosition('center');
            canvas.add(text);
          } else {
            text.setText(value.text || '');
          }

          var position = value.position || [0, 0];

          text.setColor(value.color || '#000000');
          text.setAngle(value.angle || 0);
          text.setFontSize(value.size / 100 * canvasHeight);

          if(typeof value.font === 'string') {
            text.setFontFamily(value.font);
          }

          text.setOpacity(value.opacity / 100);
          text.setLeft(position[0] * canvasWidth);
          text.setTop(position[1] * canvasHeight);

          canvas.setActiveObject(text);
          canvas.renderAll();
          canvas.calcOffset();
        }

        function onTextChanged() {
          var ngModel = this;

          $scope.$apply(function() {
            ngModel.$setViewValue(_.extend(modelValue, {
              angle: text.angle,
              size: text.fontSize / canvasHeight * 100,
              position: [text.left / canvasWidth, text.top / canvasHeight]
            }));
          });
        }

        return function(scope, element, attrs, ngModel) {
          if(!ngModel) {
            return;
          }

          canvas = new fabric.Canvas(el[0]);
          canvas.on({
            'object:moving': onTextChanged.bind(ngModel),
            'object:scaling': onTextChanged.bind(ngModel),
            'object:rotating': onTextChanged.bind(ngModel)
          });
          canvasHeight = canvas.getHeight();
          canvasWidth = canvas.getWidth();

          $scope = scope;
          $scope.$watch(attrs.ngModel, function(newValue) {
            if(!newValue) {
              return;
            }

            modelValue = newValue;
            render(newValue);
          }, true);
        }
      }
    };
  })
  .directive('filepicker', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var handler = attrs.filepicker;
        var id = "file_picker_" + Math.random();

        function onChange(event) {
          var files = event.target.files;
          scope[handler](files);
        }

        var fileInput = angular.element('<input multiple type="file">');
        fileInput.
          attr('id', id).
          on('change', onChange).
          css({
            visibility: 'hidden',
            position: 'absolute',
            top: -50,
            left: -50
          });

        element.parent().append(fileInput);
        element.on('click', function() {
          $(fileInput).click();
        });
      }
    };
  });
