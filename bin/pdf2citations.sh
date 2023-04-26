#!/bin/bash

CERMINE=lib/cermine-impl-1.13-jar-with-dependencies.jar
TIMEOUT=30
URL=$1

if [ "$URL" == "" ]; then
  echo "usage: $0 url"
  exit 1
fi

function verbose {
  TIME=$(date +%Y-%m-%dT%H:%M:%S)
  >&2 echo "${TIME} : $0 : $1"
}

WORK_DIR=`mktemp -d`

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  verbose "Could not create temp dir"
  exit 1
else
  verbose "Created ${WORK_DIR}"
fi

# deletes the temp directory
function cleanup {      
  rm -rf "$WORK_DIR"
  verbose "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Main code ...

if [[ ${URL} =~ ^http ]]; then
  wget --output-document=${WORK_DIR}/workfile.pdf ${URL}
else
  FILE=${URL/file:\/\/\/}
  cp ${FILE} ${WORK_DIR}/workfile.pdf
fi

java -cp ${CERMINE} pl.edu.icm.cermine.ContentExtractor \
     -path ${WORK_DIR} \
     -timeout ${TIMEOUT} \
     -outputs jats > /dev/null 2>&1

if [ $? -eq 0 ]; then
  node dist/jats2rdf.js ${WORK_DIR}/workfile.cermxml $URL
fi