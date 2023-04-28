#!/bin/bash

URL=$1

if [ "${URL}" == "" ]; then
    echo "usage: $0 inbox"
    exit 1
fi

sld mv ${URL} pre-ingest/

# Due to a bug in bashlib we need to recreate the inbox
sld mkdir ${URL}