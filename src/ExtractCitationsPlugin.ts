import * as N3 from 'n3';
import { spawn } from 'node:child_process';
import {
    type IPolicyType,
    PolicyPlugin,
    parseStringAsN3Store 
} from 'koreografeye';

/**
 * A PDF citation extractor using an extract extraction process (e.g. bin/pdf2citations.sh).
 * The extracted mentions and citations will be added to the main store.
 */
export class ExtractCitationsPlugin extends PolicyPlugin {
    citation_parser: string;

    /**
     * @constructor
     * @param citation_parser - The location of the pdf2citations processor
     */
    constructor(citation_parser: string) {
        super();
        this.citation_parser = citation_parser;
    }

    /**
     * Required policy parameter ex:url (the location of the PDF).
     */
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const origin = policy.origin;

            this.logger.info(`extracting citations for ${origin}`);

            const url = policy.args['http://example.org/url']?.value;

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

            citations.stderr.on('data', (data) => {
                this.logger.info(''+data);
            });

            citations.on('close', async (code) => {
                if (code != 0) {
                    this.logger.error(`${this.citation_parser} returned an error`);
                    resolve(false);
                    return;
                }

                this.logger.debug(resultData);
                
                if (! resultData || resultData.length == 0) {
                    this.logger.error(`${this.citation_parser} returned no data `)
                    resolve(false);
                    return;
                }

                try {
                    this.logger.info(`adding citation quads to the main store`);

                    const cstore = await parseStringAsN3Store(resultData);

                    let counter = 0;
                    cstore.forEach( (quad) => {
                        counter++;
                        const bn = N3.DataFactory.blankNode();
                        mainStore.addQuad(
                            bn,
                            N3.DataFactory.namedNode('https://www.w3.org/ns/activitystreams#url'),
                            quad.subject,
                            quad.graph
                        );
                        mainStore.addQuad(
                            bn,
                            quad.predicate,
                            quad.object,
                            quad.graph
                        );
                    }, null, null, null, null);

                    this.logger.info(`found ${counter} citation triples`);
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