/*
Copyright 2010 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

studio.zip = {};

studio.zip.createDownloadifyZipButton = function(element, options) {
  // TODO: badly needs to be documented :-)

  var zipperHandle = {
    fileSpecs_: []
  };

  options = options || {};
  options.swf = options.swf || 'lib/downloadify/media/downloadify.swf';
  options.downloadImage = options.downloadImage ||
      'images/download-zip-button.png';
  options.width = options.width || 133;
  options.height = options.height || 30;
  options.dataType = 'base64';
  options.onError = options.onError || function() {
    if (zipperHandle.fileSpecs_.length)
      alert('There was an error downloading the .zip');
  };

  // Zip file data and filename generator functions.
  options.filename = function() {
    return zipperHandle.zipFilename_ || 'output.zip';
  };
  options.data = function() {
    if (!zipperHandle.fileSpecs_.length)
      return '';

    var zip = new JSZip();
    for (var i = 0; i < zipperHandle.fileSpecs_.length; i++) {
      var fileSpec = zipperHandle.fileSpecs_[i];
      if (fileSpec.base64data)
        zip.add(fileSpec.name, fileSpec.base64data, {base64:true});
      else if (fileSpec.textData)
        zip.add(fileSpec.name, fileSpec.textData);
    }
    return zip.generate();
  };

  var downloadifyHandle;
  if (window.Downloadify) {
    downloadifyHandle = Downloadify.create($(element).get(0), options);
  }
  //downloadifyHandle.disable();

  // Set up zipper control functions
  zipperHandle.setZipFilename = function(zipFilename) {
    zipperHandle.zipFilename_ = zipFilename;
  };
  zipperHandle.clear = function() {
    zipperHandle.fileSpecs_ = [];
    //downloadifyHandle.disable();
  };
  zipperHandle.add = function(spec) {
    zipperHandle.fileSpecs_.push(spec);
    //downloadifyHandle.enable();
  };

  return zipperHandle;
};
