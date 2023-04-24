import * as fs from 'fs';
import * as N3 from 'n3';
import { spawn } from 'node:child_process';
import {
    type IPolicyType,
    PolicyPlugin,
    parseStringAsN3Store ,
    rdfTransformStore
} from 'koreografeye';

export class ExtractCitationsPlugin extends PolicyPlugin {
    citation_parser: string;
    outDir : string;

    constructor(citation_parser: string, outDir: string) {
        super();
        this.citation_parser = citation_parser;
        this.outDir = outDir;
    }

    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const origin = policy.origin;

            this.logger.info(`exctacting citations for ${origin}`);

            const url  = policy.args['http://example.org/url']?.value;

            if (url === undefined) {
                this.logger.error(`no url in the policy`);
                resolve(false);
                return;
            }

            this.logger.info(`processing ${url}`);

            let   resultData = '';
            const citations = spawn(this.citation_parser, [url]);

            citations.stdout.on('data', (data) => {
                resultData += data;
            });

            citations.on('close', async (code) => {
                if (code != 0) {
                    this.logger.error(`${this.citation_parser} returned an error`);
                    resolve(false);
                    return;
                }

                this.logger.debug(resultData);
                
                if (! resultData || resultData.length == 0) {
                    resolve(false);
                    return;
                }

                try {
                    this.logger.info(`adding citation quads to the main store`);

                    const cstore = await parseStringAsN3Store(resultData);

                    let counter = 0;
                    cstore.forEach( (quad) => {
                        counter++;
                        this.logger.debug(quad);
                        mainStore.addQuad(quad);
                    }, null, null, null, null);

                    this.logger.info(`found ${counter} citation triples`);

                    const outFile = this.outDir + '/' + origin.replaceAll(/^.*\//g,'');

                    this.logger.info(`creating ${outFile}`);

                    const rdf = await rdfTransformStore(mainStore, 'text/turtle');

                    fs.writeFileSync(outFile,rdf);
                } 
                catch (e) {
                    this.logger.error(`failed to parse citation output`);
                    resolve(false);
                }

                resolve(true);
            });
        });
    }
}