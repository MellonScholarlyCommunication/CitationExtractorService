import fs from 'fs';
import N3 from 'n3';
import { DOMParser } from '@xmldom/xmldom';

let xpath = require('xpath');

let file  = process.argv[2];
let url   = process.argv[3];

if (! file ) {
    console.error('usage: cermin_parser.js file [url]');
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
    await parse_citations(doc,store);
    await parse_mentions(doc,store);
    let rdf = await store2str(store);
    console.log(rdf);
}

async function store2str(store: N3.Store) : Promise<string> {
    return new Promise<string>( (resolve,_) => {
        const writer = new N3.Writer({ prefixes: {
            bibo: 'http://purl.org/ontology/bibo/'
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
  
        for (let i = 0 ; i < n1.childNodes.length ; i++ ) {
            let n2 = n1.childNodes[i];

            if (n2.nodeType === n2.TEXT_NODE) {
                let str = n2.toString();

                if (str?.match(/.*http\S+.*/)) {
                    let citation = str.replace(/.*(http\S+).*/g,"$1")
                                   .replace(/\.$/,'');
                    citations.push(stringParser(citation));
                }
            }
            else {
                let str = n2.firstChild?.toString();

                if (str?.match(/.*http\S+.*/)) {
                    let citation = str.replace(/.*(http\S+).*/g,"$1")
                                   .replace(/\.$/,'');
                    citations.push(stringParser(citation));
                }
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

        const uniqueCitations = [...new Set<string>(citations)];

        uniqueCitations.filter( (str:string) => validURL(str)).forEach( (str) => {
            if (!str) {
                return;
            }

            store.addQuad(
                namedNode(url ? url : file),
                namedNode('http://purl.org/ontology/bibo/cites'),
                namedNode(str),
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
 
        const uniqueMentions = [...new Set<string>(mentions)];

        uniqueMentions.filter( (str:string) => validURL(str) ).forEach( (str: string) => {
            if (!str) {
                return;
            }

            store.addQuad(
                namedNode(url ? url : file),
                namedNode('http://purl.org/ontology/bibo/mentions'),
                namedNode(str),
                defaultGraph()
            );
        });

        resolve();
    });
}

function validURL(str: string) : boolean {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

    let valid = !!pattern.test(str);

    return valid;
}

function stringParser(str: string | undefined) {
    if (!str) {
        return "";
    }
    
    let parsed = str.replace(/[\s]+/gm,' ')
                    .replace(/^\s+/,'')
                    .replace(/\s+$/,'');
    return parsed;
}