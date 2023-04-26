import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

export class MockInboxLocatorPlugin extends PolicyPlugin {
    fakeBaseUrl : string;

    constructor(fakeBaseUrl: string) {
        super();
        this.fakeBaseUrl = fakeBaseUrl;
    }

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
                this.logger.debug(`inbox: ${inboxValue}`);

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
        const baseUrl = resource.replace(/^http(s):\/\//,'')
                                .replace(/\/.*/,'')
                                .replace(/$/,'/inbox/');
        return this.fakeBaseUrl + '/' + baseUrl;
    }
}