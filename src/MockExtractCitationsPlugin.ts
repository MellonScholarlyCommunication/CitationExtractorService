import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

export class MockExtractCitationsPlugin extends PolicyPlugin {
    mockMentions : string[];
    mockCitations : string[];

    constructor(mockMentions: string[], mockCitations: string[]) {
        super();
        this.mockMentions = mockMentions;
        this.mockCitations = mockCitations;
    }

    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const origin = policy.origin;

            this.logger.info(`extracting citations for ${origin}`);

            const url  = policy.args['http://example.org/url']?.value.replace(/^file:\/\/\//,'');

            if (url === undefined) {
                this.logger.error(`no url in the policy`);
                resolve(false);
                return;
            }

            this.logger.info(`processing ${url}`);

            this.mockMentions.forEach( (mention) => {
                mainStore.addQuad(
                    N3.DataFactory.namedNode(url),
                    N3.DataFactory.namedNode('http://purl.org/ontology/bibo/mentions'),
                    N3.DataFactory.namedNode(mention),
                    N3.DataFactory.defaultGraph()
                );
            });

            this.mockCitations.forEach( (citation) => {
                mainStore.addQuad(
                    N3.DataFactory.namedNode(url),
                    N3.DataFactory.namedNode('http://purl.org/ontology/bibo/cites'),
                    N3.DataFactory.namedNode(citation),
                    N3.DataFactory.defaultGraph()
                );
            });

            resolve(true);
        });
    }
}