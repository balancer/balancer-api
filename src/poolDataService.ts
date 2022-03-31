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
        const pools = await getPools(this.chainId);
        return pools ?? [];
    }
}