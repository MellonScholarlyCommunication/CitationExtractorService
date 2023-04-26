#!/bin/bash

WD=`pwd`

if [ ! -d ${WD}/../OAI-Bridge ]; then
    echo "${WD}/../OAI-Bridge not installed!"
    exit 2
fi

cd ${WD}/../OAI-Bridge

echo "Clean previous run..."

npm run clean:real

echo "Fetch some OAI-PMH data from https://biblio.ugent.be (Biblio)"

npm run oai:biblio

echo "Run the orchestrator on the Biblio input"

npm run orch

echo "Run the policy executor on the result of Biblio processing"

npm run pol
