import { SubgraphPoolBase } from '@balancer-labs/sdk';
import { PoolDataService } from '@balancer-labs/sor';
import { getPools } from "./dynamodb";

interface DatabasePoolDataServiceConfig {
    chainId: number;
}

export class DatabasePoolDataService implements PoolDataService {
    chainId;
    constructor(
        readonly config: DatabasePoolDataServiceConfig
    ) { 
        this.chainId = config.chainId;
    }

    public async getPools(): Promise<SubgraphPoolBase[]> {
        console.log(`Retrieving pools for chain ${this.chainId} from the database`);
        const pools = await getPools(this.chainId);
        console.log(`Retrieved ${pools.length} pools`);
        return pools ?? [];
    }
}