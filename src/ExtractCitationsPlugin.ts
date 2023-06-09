import * as N3 from 'n3';
import * as fs from 'fs';
import { spawn } from 'node:child_process';
import { v4 as uuidv4 } from 'uuid';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

/**
 * A PDF citation extractor using an extract extraction process (e.g. bin/pdf2citations.sh).
 * The extracted mentions and citations will be added to the main store.
 */
export class ExtractCitationsPlugin extends PolicyPlugin {
    citation_parser: string;
    outputDirectory: string;
    resultBaseUrl: string;

    /**
     * @constructor
     * @param citation_parser - The location of the pdf2citations processor
     */
    constructor(citation_parser: string, outputDirectory: string, resultBaseUrl: string) {
        super();
        this.citation_parser = citation_parser;
        this.outputDirectory = outputDirectory;
        this.resultBaseUrl   = resultBaseUrl;
    }

    /**
     * Required policy parameter ex:url (the location of the PDF).
     */
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const url = policy.args['http://example.org/url'];

            if (url === undefined) {
                this.logger.error(`no url in the policy`);
                resolve(false);
                return;
            }

            this.logger.info(`processing ${url[0].value}`);

            let   resultData = '';
            const citations = spawn(this.citation_parser, [url[0].value]);

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
                    const serviceResultId   = uuidv4();
                    const serviceResultFile = this.outputDirectory + '/' + serviceResultId + '.ttl';
                    const serviceResultUrl  = this.resultBaseUrl + '/' + serviceResultId + '.ttl';

                    this.logger.info(`creating service result file ${serviceResultFile}`);

                    fs.writeFileSync(serviceResultFile,resultData);

                    this.logger.info(`adding service result url ${serviceResultUrl} to main store`);

                    mainStore.addQuad(
                            N3.DataFactory.blankNode(),
                            N3.DataFactory.namedNode('http://example.org/serviceResult'),
                            N3.DataFactory.namedNode(serviceResultUrl),
                            N3.DataFactory.defaultGraph()
                    );
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