#!/bin/bash

WD=`pwd`

cd ${WD}/../OAI-bridge

npx orch --keep --info --in in --out out ${WD}/rules/*.n3