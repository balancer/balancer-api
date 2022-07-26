import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sdk';
import { getPools } from "./data-providers/dynamodb";
import debug from 'debug';
import util from 'util';

const log = debug('balancer:pool-data-service');

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
        log(`Retrieving pools for chain ${this.chainId} from the database`);
        const pools = await getPools(this.chainId);
        log(`Retrieved pools:`, util.inspect(pools, false, null));
        return pools ?? [];
    }
}