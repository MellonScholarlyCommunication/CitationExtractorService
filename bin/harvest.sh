#!/bin/bash

WD=`pwd`

cd ${WD}/../OAI-bridge

rm cache.db

npm run oai:biblio