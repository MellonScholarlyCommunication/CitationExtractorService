import minimist from 'minimist';
import fetch from 'node-fetch';
import N3 from 'n3';

const EX   = 'http://example.org/';
const CITO = 'http://purl.org/spar/cito/';
const RDF  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

const OPENCITATION_BASE = "https://opencitations.net/index/coci/api/v1/references";

let argv  = minimist(process.argv.slice(2));
let doi = argv['_'][0];

if (! doi ) {
    console.error('usage: doi2rdf.js file [url]');
    process.exit(1);
}

main();

async function main() {
    let parsed_doi = doi.replace(/http(s)?:\/\/[^\/]+\//g,"");
    let citations = await fetchCitations(parsed_doi); 
    
    if (! citations) 
        return;

    if (citations.length == 0) 
        return; 

    const store = new N3.Store();

    citations2rdf(citations,store);

    console.log(await store2str(store));
}

async function store2str(store: N3.Store) : Promise<string> {
    return new Promise<string>( (resolve,_) => {
        const writer = new N3.Writer({ prefixes: {
            ex: EX,
            cito: CITO
        }});

        store.forEach( (quad) => {
            writer.addQuad(quad);
        },null,null,null,null);

        writer.end((_, result) => resolve(result));
    });
}

async function fetchCitations(doi:string) : Promise<any | null> {
    const response = await fetch(`${OPENCITATION_BASE}/${doi}`);

    if (response.ok) {
        return await response.json();        
    }
    else {
        return null;
    }
}

async function citations2rdf(citations: any[], store: N3.Store) : Promise<void> {
    return new Promise<void>( (resolve,_) => {
        const DataFactory = N3.DataFactory;
        const namedNode = DataFactory.namedNode;
        const defaultGraph = DataFactory.defaultGraph;

        citations.forEach( (citation) => {
            const citationIdentifier = makeCitationId(citation['oci']);

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(RDF + 'type'),
                namedNode(CITO + 'Citation'),
                defaultGraph()
            );

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(CITO + 'hasCitingEntity'),
                namedNode('https://doi.org/' + citation['citing']),
                defaultGraph()
            );

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(CITO + 'hasCitedEntity'),
                namedNode('https://doi.org/' + citation['cited']),
                defaultGraph()
            );
        });

        resolve();
    });
}

function makeCitationId(oci:string) : string {
    return EX + 'citation/' + oci;
}
