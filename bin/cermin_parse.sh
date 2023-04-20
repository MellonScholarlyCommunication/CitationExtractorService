#!/bin/bash

FILE=$1

if [ "${FILE}" == "" ]; then
    echo "usage: $0 cermin-file"
    exit 1
fi

node dist/jats2rdf.js ${FILE}