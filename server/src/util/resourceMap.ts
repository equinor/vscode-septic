import { URI } from "vscode-languageserver";

type ResourceToKey = (uri: URI) => string;

const defaultResourceToKey = (resource: URI): string => resource.toString();

export class ResourceMap<T> {
	readonly map = new Map<string, { uri: URI; value: T }>();

	readonly toKey: ResourceToKey;

	constructor(toKey: ResourceToKey = defaultResourceToKey) {
		this.toKey = toKey;
	}

	public set(uri: URI, value: T) {
		this.map.set(this.toKey(uri), { uri, value });
	}

	public get(uri: URI) {
		return this.map.get(this.toKey(uri))?.value;
	}

	public has(resource: URI) {
		return this.map.has(this.toKey(resource));
	}

	public clear() {
		this.map.clear();
	}

	public size() {
		return this.map.size;
	}

	public delete(resource: URI) {
		this.map.delete(this.toKey(resource));
	}
}
