import { SepticObject } from "./septicElements";

export interface SepticReference {
    identifier: string;
    location: {
        uri: string;
        start: number;
        end: number;
    };
    obj?: SepticObject;
}

export interface SepticReferenceProvider {
    load(): Promise<void>;
    getXvrRefs(name: string): SepticReference[] | undefined;
    getAllXvrObjects(): SepticObject[];
}
