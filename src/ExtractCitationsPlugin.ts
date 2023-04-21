import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

export class ExtractCitationsPlugin extends PolicyPlugin {
    baseurl : string | undefined;
    test = false;

    public async execute (_mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
        this.logger.info('start');

        const url  = policy.args['http://example.org/url']?.value;

        this.logger.info(`>>${url}`);

        this.logger.info('end');

        return true;
    }
}