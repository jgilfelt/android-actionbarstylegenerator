Android Action Bar Style Generator
==================================

####DEPRECATED: Consider using [Toolbar](http://developer.android.com/reference/android/widget/Toolbar.html) or its [support library equivalent](http://developer.android.com/reference/android/support/v7/widget/Toolbar.html).####

The Android Action Bar Style Generator allows you to easily create a simple, attractive and seamless custom action bar style for your Android application. It will generate all necessary nine patch assets plus associated XML drawables and styles which you can copy straight into your project.

Use it online here: http://jgilfelt.github.com/android-actionbarstylegenerator/

Building
--------

- Ensure the following build dependencies are installed:
  + Java Runtime Environment
  + Ant
  + [pngcrush](http://pmt.sourceforge.net/pngcrush/index.html)
  + [flintjs](http://code.google.com/p/flintjs/) 
- Clone the repository.
- Create a `local.properties` file in the `src/js` folder containing the path to flintjs (e.g. `flintjs.dir=/Users/foo/flintjs-0.1.1`).
- Run `make.sh`. The build is generated in the `dist` folder.
- Access `dist/index.html` from a local web server.

Credits
-------

Author: Jeff Gilfelt

Built upon the [android-ui-utils](http://code.google.com/p/android-ui-utils) asset studio framework created by [Roman Nurik](http://roman.nurik.net/), copyright Google Inc.

License
-------

    Copyright 2013 readyState Software Limited
    Copyright 2012 Google Inc

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

