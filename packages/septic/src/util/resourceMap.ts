/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

type ResourceToKey = (uri: string) => string;

const defaultResourceToKey = (resource: string): string => resource.toString();

export class ResourceMap<T> {
    readonly map = new Map<string, { uri: string; value: T }>();

    readonly toKey: ResourceToKey;

    constructor(toKey: ResourceToKey = defaultResourceToKey) {
        this.toKey = toKey;
    }

    public set(uri: string, value: T) {
        this.map.set(this.toKey(uri), { uri, value });
    }

    public get(uri: string) {
        return this.map.get(this.toKey(uri))?.value;
    }

    public has(resource: string) {
        return this.map.has(this.toKey(resource));
    }

    public clear() {
        this.map.clear();
    }

    public size() {
        return this.map.size;
    }

    public delete(resource: string) {
        this.map.delete(this.toKey(resource));
    }

    public keys(): string[] {
        return Array.from(this.map.keys());
    }
}
