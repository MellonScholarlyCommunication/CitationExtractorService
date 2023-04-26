import * as fs from 'fs';
import * as N3 from 'n3';
import {
    type IPolicyType,
    PolicyPlugin ,
    rdfTransformStore
} from 'koreografeye';

/**
 * A plugin to serialize the main store to a file on disk
 */
export class SerializeAsPlugin extends PolicyPlugin {

    /**
     * Requires ex:path the new file name of the main store serialization
     */
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( async (resolve,_) => {
            const path  = policy.args['http://example.org/path']?.value.replace(/^file:\/\/\//,"");

            if (path === undefined) {
                this.logger.error(`no path in the policy`);
                resolve(false);
                return;
            }

            this.logger.info(`writing main store to ${path}`);

            try {
                const rdf = await rdfTransformStore(mainStore, "text/turtle");

                fs.writeFileSync(path,rdf);
            }
            catch (e) {
                this.logger.error(`failed to write to ${path}`);
                resolve(false);
                return;
            }

            resolve(true);
        });
    }
}