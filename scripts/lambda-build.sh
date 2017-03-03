#!/bin/sh
mkdir -p build
rm -r build/*
cp index.js package.json config.json build
(
    cd build;
    npm install --production;
    rm package.json;
)
zip -qrmX build.zip build
