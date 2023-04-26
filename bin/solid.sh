#!/bin/bash

PORT=3000

cd solid

if [ ! -d inbox ]; then
    mkdir inbox
fi

rm inbox/*

if [ -d experiment ]; then
    rm -rf experiment
fi

community-solid-server -p ${PORT} -c @css:config/file-no-setup.json
