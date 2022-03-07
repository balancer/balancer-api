import { SubgraphPoolBase } from '@balancer-labs/sdk';
import { PoolDataService } from '@balancer-labs/sor';
import { getPools } from "./dynamodb";


export class DataBasePoolDataService implements PoolDataService {
    chainId;
    constructor(
        private readonly config: {
            chainId: number;
        }
    ) { }

    public async getPools(): Promise<SubgraphPoolBase[]> {
        // FETCH POOLS FROM DB
        const pools = await getPools(this.chainId);
        return pools ?? [];
    }
}