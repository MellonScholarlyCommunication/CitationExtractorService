import minimist from 'minimist';
import fs from 'fs';
import N3 from 'n3';
import md5 from 'md5';
import { DOMParser } from '@xmldom/xmldom';

const EX   = 'http://example.org/';
const CITO = 'http://purl.org/spar/cito/';
const SORG = 'http://schema.org/';
const PEXT = 'http://www.ontotext.com/proton/protonext#';
const RDF  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

let xpath = require('xpath');

let argv  = minimist(process.argv.slice(2));

let file  = argv['_'][0];
let url   = argv['_'][1];

if (! file ) {
    console.error('usage: [--no-citations] [--no-mentions] cermin_parser.js file [url]');
    process.exit(1);
}

const store = new N3.Store();

try {
    let xml = fs.readFileSync(file, 'utf8');
    let doc = new DOMParser().parseFromString(xml);
    main(doc);
}
catch (e) {
    console.error(`Failed to parse ${file}`);
}

async function main(doc: Document) : Promise<void> {
    if (argv['citations'] === undefined || argv['citations'] === true ) {
        await parse_citations(doc,store);
    }

    if (argv['mentions'] === undefined || argv['mentions'] === true) {
        await parse_mentions(doc,store);
    }

    let rdf = await store2str(store);
    console.log(rdf);
}

async function store2str(store: N3.Store) : Promise<string> {
    return new Promise<string>( (resolve,_) => {
        const writer = new N3.Writer({ prefixes: {
            ex: EX,
            cito: CITO,
            schema: SORG,
            pext: PEXT
        }});

        store.forEach( (quad) => {
            writer.addQuad(quad);
        },null,null,null,null);

        writer.end((_, result) => resolve(result));
    });
}

async function parse_mentions(doc : Document, store: N3.Store) : Promise<void> {
    let str = "";

    for (let i = 0 ; i < doc.childNodes.length ; i++) {
        str += parse_child(doc.childNodes[i]);
    }

    let urls : string[] = [];

    str.split(/\s+/).forEach( (part) => {
        if (part.match(/http/)) {
            let url = part.replace(/(http\S+)/,"$1");
            urls.push(url);
        }
    });

    await mentions2rdf(urls,store);
}

function parse_child(node: Node) : string {
    if (node.nodeType === node.TEXT_NODE) {
        let str = node.textContent;
        return str ? str : "";
    }
    else {
        if (node.hasChildNodes()) {
            let str = "";
            for (let i = 0 ; i < node.childNodes.length ; i++) {
                str += parse_child(node.childNodes[i]);       
            }
            return str;
        }
        else {
            return "";
        }
    }
}

async function parse_citations(doc : Document, store: N3.Store) : Promise<void> {
    let nodes = xpath.select('/article/back/ref-list//ref/mixed-citation',doc);

    if (nodes.length == 0) {
        return;
    }

    let citations : string[] = [];

    nodes.forEach( async (n1 : Node) => {
        if (! n1.hasChildNodes()) {
            return;
        }
 
        const citationText = n1.textContent?.replace(/\n/g,'').replace(/ +/g,' ');

        if (citationText?.match(/.*http\S+.*/)) {
            const citation = citationText.replace(/.*(http.*)/g,"$1")
                              .replace(/ +/g,'')
                              .replace(/\n/g,'')
                              .replace(/\.$/,'');
            if (citation.length) {
                citations.push(citation);
            }
        }
        else if (citationText?.match(/.*[Dd][Oo][Ii]/)) {
            const citation = citationText.replace(/.*[Dd][Oo][Ii]\s*:?\s*(\S+)/,"$1")
                              .replace(/ +/g,'')
                              .replace(/\n/g,'')
                              .replace(/\.$/,'');
            if (citation.length) {
                citations.push(`http://dx.doi.org/${citation}`);
            }
        }
    });

    await citations2rdf(citations,store);
}

async function citations2rdf(citations: string[], store: N3.Store) : Promise<void> {

    return new Promise<void>( (resolve,_) => {
        const DataFactory = N3.DataFactory;
        const namedNode = DataFactory.namedNode;
        const defaultGraph = DataFactory.defaultGraph;

        const citingEntity = url ? url : file;

        const uniqueCitations = [...new Set<string>(citations)];

        uniqueCitations.filter( (str:string) => validURL(str)).forEach( (citedEntity) => {
            if (!citedEntity) {
                return;
            }

            const citationIdentifier = makeCitationId(citingEntity,citedEntity);

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(RDF + 'type'),
                namedNode(CITO + 'Citation'),
                defaultGraph()
            );

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(CITO + 'hasCitingEntity'),
                namedNode(citingEntity),
                defaultGraph()
            );

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(CITO + 'hasCitedEntity'),
                namedNode(citedEntity),
                defaultGraph()
            );
        });

        resolve();
    });
}

async function mentions2rdf(mentions: string[], store: N3.Store) : Promise<void> {

    return new Promise<void>( (resolve,_) => {
        const DataFactory = N3.DataFactory;
        const namedNode = DataFactory.namedNode;
        const defaultGraph = DataFactory.defaultGraph;
 
        const citingEntity = url ? url : file;

        const uniqueMentions = [...new Set<string>(mentions)];

        uniqueMentions.filter( (str:string) => validURL(str) ).forEach( (citedEntity: string) => {
            if (!citedEntity) {
                return;
            }

            const citationIdentifier = makeMentionId(citingEntity,citedEntity);

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(RDF + 'type'),
                namedNode(PEXT + 'Mention'),
                defaultGraph()
            );

            store.addQuad(
                namedNode(citationIdentifier),
                namedNode(SORG + 'mentions'),
                namedNode(citedEntity),
                defaultGraph()
            );
        });

        resolve();
    });
}

function validURL(str: string) : boolean {
    let url;
   
    if (str.match(/^(http[A-Za-z0-9\-\._~:\/\?#[\]@!\$&'()*\+,;=%]+)$/g)) {
        // All is ok
    }
    else {
        return false;
    }

    try {
        url = new URL(str);
    }
    catch (_) {
        return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
}

function makeCitationId(citingEntity: string, citedEntity: string) : string {
    return EX + 'citation/' + md5(citingEntity + '-' + citedEntity);
}

function makeMentionId(citingEntity: string, citedEntity: string) : string {
    return EX + 'mention/' + md5(citingEntity + '-' + citedEntity);
}