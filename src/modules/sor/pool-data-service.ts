import debug from 'debug';
import { PoolDataService } from '@balancer-labs/sor';
import { SubgraphPoolBase } from '@balancer-labs/sdk';
import { getPools, queryPools } from '@/modules/dynamodb';
import { Pool, convertPoolToSubgraphPoolBase } from '@/modules/pools';

const log = debug('balancer:pool-data-service');

interface DatabasePoolDataServiceConfig {
  chainId: number;
  minLiquidity: string;
}

export class DatabasePoolDataService implements PoolDataService {
  chainId;
  filterParams;

  constructor(readonly config: DatabasePoolDataServiceConfig) {
    const minLiquidity = config.minLiquidity;
    this.chainId = config.chainId;
    this.filterParams = {
      IndexName: 'byTotalLiquidity',
      KeyConditionExpression:
        'totalLiquidity > :totalLiquidity AND chainId = :chainId',
      ExpressionAttributeValues: {
        ':totalLiquidity': { N: minLiquidity },
        ':chainId': { N: this.chainId?.toString() },
      },
    };
  }

  public async getPools(filterPools = true): Promise<SubgraphPoolBase[]> {
    log(`Retrieving pools for chain ${this.chainId} from the database`);

    let pools: Pool[];
    if (filterPools) {
      pools = await queryPools(this.filterParams);
    } else {
      pools = await getPools(this.chainId);
    }

    log(`Retrieved ${pools.length} pools`);
    const subgraphPools = pools.map(pool =>
      convertPoolToSubgraphPoolBase(pool)
    );
    log(`Found ${subgraphPools.length} subgraph pools total`);
    const enabledPools = subgraphPools.filter(pool => pool.swapEnabled);
    log(`Found ${enabledPools.length} enabled pools`);
    return enabledPools ?? [];
  }
}
