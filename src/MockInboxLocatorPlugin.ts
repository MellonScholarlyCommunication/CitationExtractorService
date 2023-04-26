import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

/**
 * A mock LDN inbox locator. Every resource will get an inbox based on a faseBaseUrl
 */
export class MockInboxLocatorPlugin extends PolicyPlugin {
    fakeBaseUrl : string;

    /**
     * @constructor
     * @param fakeBaseUrl - The base url for a fake inbox
     */
    constructor(fakeBaseUrl: string) {
        super();
        this.fakeBaseUrl = fakeBaseUrl;
    }

    /**
     * Required policy parameter ex:predicate (the predicate that points to a resource
     * to discover the LDN inbox for).
     */
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( async (resolve,_) => {
            const predicate  = policy.args['http://example.org/predicate']?.value;

            if (predicate === undefined) {
                this.logger.error(`no predicate in policy`);
                resolve(false);
                return;
            }

            this.logger.info(`scanning main store for ${predicate}`);

            mainStore.forEach( (quad) => {
                const urlValue = quad.object.value;
                this.logger.debug(`url: ${urlValue}`);

                const inboxValue = this.fakeResolveInbox(urlValue);
                this.logger.info(`inbox: ${inboxValue}`);

                mainStore.addQuad(
                    N3.DataFactory.namedNode(urlValue),
                    N3.DataFactory.namedNode('http://www.w3.org/ns/ldp#inbox'),
                    N3.DataFactory.namedNode(inboxValue),
                    N3.DataFactory.defaultGraph()
                );
            },null,N3.DataFactory.namedNode(predicate),null,null);

            resolve(true);
        });
    }

    private fakeResolveInbox(resource: string) : string {
        this.logger.info(`resolving inbox for ${resource}`);
        const baseUrl = resource.replace(/^http(s)?:\/\//,'')
                                .replace(/\/.*/,'')
                                .replace(/$/,'/inbox/');
        return this.fakeBaseUrl + '/' + baseUrl;
    }
}