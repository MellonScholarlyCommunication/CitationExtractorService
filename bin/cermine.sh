#!/bin/bash

TIMEOUT=30
FILE=$1
URL=$2

if [ "$FILE" == "" ]; then
     echo "usage: $0 file"
     exit 1
fi

WORK_DIR=`mktemp -d`

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  >&2 echo "Could not create temp dir"
  exit 1
else
  >&2 echo "Created ${WORK_DIR}"
fi

# deletes the temp directory
function cleanup {      
  rm -rf "$WORK_DIR"
  >&2 echo "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Main code ...

cp ${FILE} ${WORK_DIR}/workfile.pdf

java -cp lib/cermine-impl-1.13-jar-with-dependencies.jar pl.edu.icm.cermine.ContentExtractor \
     -path ${WORK_DIR} \
     -timeout ${TIMEOUT} \
     -outputs jats > /dev/null 2>&1

if [ $? -eq 0 ]; then
     node dist/jats2rdf.js ${WORK_DIR}/workfile.cermxml $URL
fi