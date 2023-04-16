#!/usr/bin/env bash

set -eux

npm install
# node .
./index.js >../index.html

cp *.svg ..
cp *.css ..
cp starry-night/style/high-contrast-light.css ../starry-night.css
cp img/* ../img/
