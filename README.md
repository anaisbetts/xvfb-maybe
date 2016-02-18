# xvfb-maybe

This package runs an arbitrary executable / args under `xvfb-run` if the
platform is Linux and DISPLAY isn't set. This is super useful for making
Electron unit tests run correctly in CI environments while still working
locally

## Usage:

```sh
## On Windows or OS X, this just invokes electron-mocha
## On Linux, if we are in a headless environment, this will be equivalent 
## to xvfb-run electron-mocha ./test/*.js
xvfb-maybe electron-mocha ./test/*.js
```
