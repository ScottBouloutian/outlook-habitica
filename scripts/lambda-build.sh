#!/bin/sh

# Build Outlook
mkdir -p build
rm -r build/*
cp -r package.json index.js lib build
(
    cd build;
    npm install --production;
    rm package.json;
)
zip -qrmX build.zip build
