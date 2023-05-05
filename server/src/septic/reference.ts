import { SepticObject } from "./septicElements";

export interface SepticReference {
    identifier: string;
    location: {
        start: number;
        end: number;
    };
    obj?: SepticObject;
}
