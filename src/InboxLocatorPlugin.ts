import * as N3 from 'n3';
import parseLinkHeader from 'parse-link-header';
import {
    type IPolicyType,
    PolicyPlugin
} from 'koreografeye';

export class InboxLocatorPlugin extends PolicyPlugin {
    public async execute (mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( async (resolve,_) => {
            const predicate  = policy.args['http://example.org/predicate']?.value;

            if (predicate === undefined) {
                this.logger.error(`no predicate in policy`);
                resolve(false);
                return;
            }

            this.logger.info(`scanning main store for ${predicate}`);

            const inboxLocationsP : Promise<string[]|null>[] = [];

            mainStore.forEach( (quad) => {
                const resource = quad.object.value;
                this.logger.debug(`adding resolvePublication(${resource}) to the queue...`);
                inboxLocationsP.push(this.resolvePublication(resource));
            },null,N3.DataFactory.namedNode(predicate),null,null);

            const inboxLocations = await Promise.all(inboxLocationsP);

            inboxLocations.forEach( (location) => {
                
                if (location === null) {
                    return;
                }

                const publication = location[0];
                const inbox       = location[1];

                mainStore.addQuad(
                    N3.DataFactory.namedNode(publication),
                    N3.DataFactory.namedNode('http://www.w3.org/ns/ldp#inbox'),
                    N3.DataFactory.namedNode(inbox),
                    N3.DataFactory.defaultGraph()
                );
            });

            resolve(true);
        });
    }

    private async resolvePublication(resource: string) : Promise<string[]|null> {
        this.logger.info(`resolving inbox for ${resource}`);

        const inboxLocation = await this.resolveInbox(resource);

        this.logger.info(`inbox resolved to ${inboxLocation}`);

        if (inboxLocation != null) {
            return [resource,inboxLocation];
        }
        else {
            return null;
        }
    }

    private async resolveInbox(resource: string) : Promise<string|null> {
        return new Promise( async(resolve,_) => {
            try {
                const response = await fetch(resource, { method: 'HEAD'} );

                if (! response.ok) {
                    this.logger.error(`failed to retrieve ${resource} : ${(await response).status}`);
                    resolve(null);
                    return;
                }

                const linkHeaders = response.headers.get('Link');

                this.logger.debug(`linked headers ${resource} : ${linkHeaders}`);

                if (linkHeaders === null) {
                    this.logger.debug(`${resource} does not have link headers`);
                    resolve(null);
                    return;
                }

                const parsedLinkHeaders = parseLinkHeader(linkHeaders);

                if (parsedLinkHeaders == null) {
                    this.logger.debug(`${resource} failed to parse link headers`);
                    resolve(null);
                    return;
                }

                if (parsedLinkHeaders['http://www.w3.org/ns/ldp#inbox']) {
                    const inbox = parsedLinkHeaders['http://www.w3.org/ns/ldp#inbox']['url'];
                    this.logger.info(`${resource} inbox : ${inbox}`);
                    resolve(inbox);
                }
                else {
                    this.logger.info(`${resolve} has no http://www.w3.org/ns/ldp#inbox`);
                    resolve(null);
                    return;
                }
            }
            catch (e) {
                this.logger.error(`failed to retrieve ${resource} : general error`);
                resolve(null);
                return;
            }
        });
    }
}