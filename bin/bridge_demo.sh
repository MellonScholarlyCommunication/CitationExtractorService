#!/bin/bash

RULE=""
FROM="2023-01-01"
UNTIL="2023-01-31"
MAX=10
SET="allFtxt"
OAI="https://biblio.ugent.be/oai"

OPTIND=1
while getopts "c:f:m:o:s:u:" opt
do
    case "$opt" in
        'c') RULE=$OPTARG ;;
        'f') FROM=$OPTARG ;;
        'u') UNTIL=$OPTARG ;;
        'm') MAX=$OPTARG ;;
        's') SET=$OPTARG ;;
        'o') OAI=$OPTARG ;;
    esac
done

shift $(expr $OPTIND - 1)

CMD=$1

if [ "${CMD}" == "" ]; then
    echo "usage: $0 [options] new|next"
    cat <<EOF
options:
    -c rule-config
    -f from                 ${FROM}
    -u until                ${UNTIL}
    -s setSpec              ${SET}
    -o oai-endpoint         ${OAI}
    -m max-no-del-records   ${MAX}
EOF
    exit 1
fi

WD=`pwd`

if [ ! -d ${WD}/../OAI-Bridge ]; then
    echo "${WD}/../OAI-Bridge not installed!"
    exit 2
fi

cd ${WD}/../OAI-Bridge

if [ "${CMD}" == "next" ]; then
    echo "Create new run ..."
else
    echo "Clean previous run..."
    npm run clean:real
fi

echo "Fetch some OAI-PMH data from https://biblio.ugent.be (Biblio)"

node dist/client.js --info --from ${FROM} --until ${UNTIL} --max-no-del ${MAX} --setSpec ${SET} ${OAI}

echo "Run the orchestrator on the Biblio input"

if [ "${RULE}" == "" ]; then
    npx orch --info --in in --out out rules/sendNotification.n3
else
    npx orch --info --in in --out out ${RULE}
fi

echo "Run the policy executor on the result of Biblio processing"

npx pol --info --in out