#!/usr/bin/env bash

set -eux

SCRIPT_HOME="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
pushd $SCRIPT_HOME

npm install
# node .
./index.js >../index.html

cp *.svg ..
cp *.css ..
cp starry-night/style/high-contrast-light.css ../starry-night.css
cp img/* ../img/
