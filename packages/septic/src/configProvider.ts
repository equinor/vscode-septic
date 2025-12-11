import { SepticCnfg } from "./cnfg";

export interface ISepticConfigProvider {
    get(resource: string): Promise<SepticCnfg | undefined>;
}
