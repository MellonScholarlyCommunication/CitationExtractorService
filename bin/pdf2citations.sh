#!/bin/bash

usage() { echo "usage: $0 [-d] url" 1>&2; exit 1; }

DEBUG=0

while getopts "d" o; do
    case "${o}" in
        d)
            DEBUG=1
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))

CERMINE=lib/cermine-impl-1.13-jar-with-dependencies.jar
TIMEOUT=30
URL=$1
MAXFILESIZE=4000000

if [ "$URL" == "" ]; then
  usage
fi

function verbose {
  TIME=$(date +%Y-%m-%dT%H:%M:%S)
  >&2 echo "${TIME} : $0 : $1"
}

if [ ${DEBUG} -eq 0 ]; then
  WORK_DIR=`mktemp -d`
else
  WORK_DIR=/tmp/citationextractor
  mkdir -p ${WORK_DIR}
fi

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
if [ ${DEBUG} -eq 0 ]; then
  trap cleanup EXIT
fi

# Main code ...

if [[ ${URL} =~ ^http ]]; then
  wget --quiet --output-document=${WORK_DIR}/workfile.pdf ${URL}
else
  FILE=${URL/file:\/\/\/}
  cp ${FILE} ${WORK_DIR}/workfile.pdf
fi

actualsize=$(wc -c < ${WORK_DIR}/workfile.pdf)

if [ $actualsize -ge $MAXFILESIZE ]; then
  verbose "${URL} is over ${MAXFILESIZE} bytes (${actualsize})"
  exit 2
fi

java -cp ${CERMINE} pl.edu.icm.cermine.ContentExtractor \
     -path ${WORK_DIR} \
     -timeout ${TIMEOUT} \
     -outputs jats > /dev/null 2>&1

if [ $? -eq 0 ]; then
  if [ -f ${WORK_DIR}/workfile.cermxml ]; then
    node dist/jats2rdf.js ${WORK_DIR}/workfile.cermxml $URL
  fi
fi