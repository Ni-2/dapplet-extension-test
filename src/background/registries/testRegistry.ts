import { Registry } from './registry';

export class TestRegistry implements Registry {
    constructor(public endpointUrl: string) {
        // example: https://test.dapplets.org/api/registry/dapplet-base
        if (!endpointUrl) throw new Error("Endpoint Url is required");
    }

    public async getVersions(name: string, branch: string): Promise<string[]> {
        const response = await fetch(`${this.endpointUrl}/registry/get-versions?name=${name}&branch=${branch}`);
        const json = await response.json();
        const versions = json.data;
        // ToDo: SORT
        return versions;
    }

    public async resolveToUri(name: string, branch: string, version: string): Promise<string[]> {
        const response = await fetch(`${this.endpointUrl}/registry/resolve-to-uri?name=${name}&branch=${branch}&version=${version}`);
        const json = await response.json();
        const uris = json.data;
        return uris;
    }

    public async getFeatures(hostnames: string[]): Promise<{ [hostname: string]: { [name: string]: string[]; } }> {
        const response = await fetch(`${this.endpointUrl}/registry/get-features?${hostnames.map(h => `hostname=${h}`).join('&')}`);
        const json = await response.json();
        const features = json.data;
        return features;
    }

    public async getAllDevModules(): Promise<{ name: string, branch: string, version: string }[]> {
        return Promise.resolve([]);
    }
}