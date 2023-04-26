import * as N3 from 'n3';
import * as fs from 'fs';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

/**
 * A mock citation extractor that generates fake bibo:mention and bibo:cites.
 * The fake citations will be added to the main store.
 */
export class MockCreateInboxPlugin extends PolicyPlugin {
    fakeBaseUrl : string;
    solidPath : string;

    /**
     * @constructor
     * @param fakeBaseUrl - The base url for a fake inbox
     */
    constructor(fakeBaseUrl: string, solidPath: string) {
        super();
        this.fakeBaseUrl = fakeBaseUrl;
        this.solidPath = solidPath;
    }

    /**
     * Required policy parameter ex:url (the location of the PDF).
     */
    public async execute (_mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( (resolve,_) => {
            const origin = policy.origin;

            this.logger.info(`create inbox for ${origin}`);

            const url  = policy.args['http://www.w3.org/ns/ldp#inbox']?.value;

            if (url === undefined) {
                this.logger.error(`no ldp:inbox in the policy`);
                resolve(false);
                return;
            }

            const file = url.replace(this.fakeBaseUrl,"").replace('/','');
            const dir  = `${this.solidPath}/${file}`;

            this.logger.info(`creating for ${url} inbox ${dir}}`);

            if (! fs.existsSync(dir)) {
                fs.mkdirSync(dir, {recursive: true});
            }

            resolve(true);
        });
    }
}