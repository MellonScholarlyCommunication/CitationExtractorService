#!/bin/bash

cd solid

if [ ! -d inbox ]; then
    mkdir inbox
fi

rm inbox/*

community-solid-server -c @css:config/file-no-setup.json
