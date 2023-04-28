#!/bin/bash

PORT=3000

if [ ! -d solid ]; then
    mkdir solid
fi

cd solid

if [ ! -d service/inbox ]; then
    mkdir -p service/inbox
else
    rm service/inbox/*
fi

if [ ! -d service/results ]; then
    mkdir -p service/results
else
    rm service/results/*
fi

if [ ! -d repository/inbox ]; then
    mkdir -p repository/inbox
else
    rm repository/inbox/*
fi

community-solid-server -p ${PORT} -c @css:config/file-no-setup.json
