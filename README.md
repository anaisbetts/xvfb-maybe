# xvfb-maybe

This package runs an arbitrary executable / args under `xvfb-run` if the
platform is Linux and DISPLAY isn't set. This is super useful for making
Electron unit tests run correctly in CI environments while still working
locally
