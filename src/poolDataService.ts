import { PoolDataService, SubgraphPoolBase } from "@balancer-labs/sdk";
import { getPools } from "./data-providers/dynamodb";
import debug from "debug";
import { convertPoolToSubgraphPoolBase } from "./utils";
import { Pool } from './types';

const log = debug("balancer:pool-data-service");

interface DatabasePoolDataServiceConfig {
  chainId: number;
}

export class DatabasePoolDataService implements PoolDataService {
  chainId;
  filterParams;

  constructor(readonly config: DatabasePoolDataServiceConfig) {
    this.chainId = config.chainId;
    this.filterParams = {
      IndexName: "byTotalLiquidity",
      KeyConditionExpression:
        "#totalLiquidity > :totalLiquidityCount AND #chainId = :chainId",
      ExpressionAttributeNames: {
        "#totalLiquidity": "totalLiquidity",
        "#chainId": "chainId",
      },
      ExpressionAttributeValues: {
        ":totalLiquidityCount": { N: "100" },
        ":chainId": { N: this.chainId?.toString() },
      },
    };
  }

  public async getPools(filterPools = true): Promise<SubgraphPoolBase[]> {
    log(`Retrieving pools for chain ${this.chainId} from the database`);

    let pools: Pool[];
    if (filterPools) {
      pools = await getPools(
        undefined,
        undefined,
        this.filterParams,
        true
      );
    } else {
      pools = await getPools(this.chainId, undefined);
    }

    log(`Retrieved ${pools.length} pools`);
    const subgraphPools = pools.map((pool) =>
      convertPoolToSubgraphPoolBase(pool)
    );
    log(`Found ${subgraphPools.length} subgraph pools total`);
    const enabledPools = subgraphPools.filter((pool) => pool.swapEnabled);
    log(`Found ${enabledPools.length} enabled pools`);
    return enabledPools ?? [];
  }
}
