import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

/**
 * A mock citation extractor that generates fake bibo:mention and bibo:cites.
 * The fake citations will be added to the main store.
 */
export class MockExtractCitationsPlugin extends PolicyPlugin {
    mockMentions : string[];
    mockCitations : string[];

    /**
     * @constructor
     * @param mockMentions - The fake mentions URLs
     * @param mockCitations - The fake citation URLs
     */
    constructor(mockMentions: string[], mockCitations: string[]) {
        super();
        this.mockMentions = mockMentions;
        this.mockCitations = mockCitations;
    }

    /**
     * Required policy parameter ex:url (the location of the PDF).
     */
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const origin = policy.origin;

            this.logger.info(`extracting citations for ${origin}`);

            const url  = policy.args['http://example.org/url']?.value;

            if (url === undefined) {
                this.logger.error(`no url in the policy`);
                resolve(false);
                return;
            }

            const file = url.replace(/^file:\/\/\//,'');

            this.logger.info(`processing ${url} (${file})`);

            this.mockMentions.forEach( (mention) => {
                const bn = N3.DataFactory.blankNode();
               
                mainStore.addQuad(
                    bn,
                    N3.DataFactory.namedNode('https://www.w3.org/ns/activitystreams#url'),
                    N3.DataFactory.namedNode(url),
                    N3.DataFactory.defaultGraph()
                );

                mainStore.addQuad(
                    bn,
                    N3.DataFactory.namedNode('http://purl.org/ontology/bibo/mentions'),
                    N3.DataFactory.namedNode(mention),
                    N3.DataFactory.defaultGraph()
                );
            });

            this.mockCitations.forEach( (citation) => {
                const bn = N3.DataFactory.blankNode();
               
                mainStore.addQuad(
                    bn,
                    N3.DataFactory.namedNode('https://www.w3.org/ns/activitystreams#url'),
                    N3.DataFactory.namedNode(url),
                    N3.DataFactory.defaultGraph()
                );

                mainStore.addQuad(
                    bn,
                    N3.DataFactory.namedNode('http://purl.org/ontology/bibo/cites'),
                    N3.DataFactory.namedNode(citation),
                    N3.DataFactory.defaultGraph()
                );
            });

            resolve(true);
        });
    }
}