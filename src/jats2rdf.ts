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

let xml = fs.readFileSync(file, 'utf8');
let doc = new DOMParser().parseFromString(xml);
let nodes = xpath.select('/article/back/ref-list//ref/mixed-citation',doc);

parse_nodes(nodes);

async function parse_nodes(nodes: Node[]) {
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

            if (n2.nodeType == n2.TEXT_NODE) {
                let str = n2.toString();

                citations.push(stringParser(str));
            }
            else {
                let str = n2.firstChild?.toString();

                citations.push(stringParser(str));
            }
        }

    });

    let rdf = await citations2rdf(citations);

    console.log(rdf);
}

async function citations2rdf(citations: string[]) : Promise<string | undefined> {

    return new Promise<string>( (resolve,_) => {
        const writer = new N3.Writer({ prefixes: {
            bibo: 'http://purl.org/ontology/bibo/'
        }});

        const DataFactory = N3.DataFactory;
        const namedNode = DataFactory.namedNode;
        const defaultGraph = DataFactory.defaultGraph;
 
        citations.forEach( (str) => {
            if (!str) {
                return;
            }

            if (str?.match(/.*http\S+.*/)) {
                let citation = str.replace(/.*(http\S+).*/g,"$1")
                        .replace(/\.$/,'');

                writer.addQuad(
                    namedNode(url ? url : file),
                    namedNode('http://purl.org/ontology/bibo/cites'),
                    namedNode(citation),
                    defaultGraph()
                );
            }
        });

        writer.end((_, result) => resolve(result));
    });
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