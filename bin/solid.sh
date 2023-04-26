#!/bin/bash

cd solid

if [ ! -d inbox ]; then
    mkdir inbox
fi

rm inbox/*

if [ -d experiment ]; then
    rm -rf experiment
fi

community-solid-server -c @css:config/file-no-setup.json
