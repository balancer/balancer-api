import { JsonRpcProvider } from '@ethersproject/providers';
import {
  PoolsSubgraphRepository,
  PoolType,
  BalancerSDK,
  SubgraphPoolBase,
  Pool as SDKPool,
} from '@balancer-labs/sdk';
import { getToken } from '@/modules/dynamodb';
import { Pool } from '@/modules/pools/types';
import { Token, getTokenInfo } from '@/modules/tokens';
import { getSubgraphUrl, getRpcUrl } from '@/modules/network';

export async function fetchPoolsFromChain(chainId: number): Promise<Partial<Pool>[]> {
  const infuraUrl = getRpcUrl(chainId);
  const subgraphUrl = getSubgraphUrl(chainId);

  // Uses default PoolDataService to retrieve onstored as Chain data
  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: infuraUrl,
    customSubgraphUrl: subgraphUrl,
  });

  const fetchedPools: boolean = await balancer.sor.fetchPools();
  if (!fetchedPools) {
    throw new Error('SOR Failed to fetch pools');
  }
  const sorPools: SubgraphPoolBase[] = balancer.sor.getPools();

  const subgraphPoolFetcher = new PoolsSubgraphRepository({
    url: subgraphUrl,
    chainId,
    query: {
      args: {
        where: {
          totalShares: {
            gt: 0,
          },
        },
      },
      attrs: {},
    },
  });

  let subgraphPools: SDKPool[] = [];
  let poolBatch: SDKPool[] = [];

  const first = 1000;
  let skip = 0;
  do {
    poolBatch = await subgraphPoolFetcher.fetch({ first, skip });
    skip += first;

    subgraphPools = subgraphPools.concat(poolBatch);
  } while (poolBatch.length > 0);

  const sorPoolsMap: Record<string, SubgraphPoolBase> = Object.fromEntries(sorPools.map(pool => [pool.id, pool]));
  const subgraphPoolsMap: Record<string, SDKPool> = Object.fromEntries(
    subgraphPools.map(pool => [pool.id, pool])
  );

  const pools: Partial<Pool>[] = sorPools.map(sorPool => {
    const subgraphPool = subgraphPoolsMap[sorPool.id] || {};
    return Object.assign(
      subgraphPool,
      sorPool,
      {
        poolType: sorPool.poolType as PoolType,
        chainId,
      }
    ) as Partial<Pool>;
  });

  const subgraphPoolsMissingFromSor: Partial<Pool>[] = subgraphPools
    .filter(subgraphPool => {
      return !sorPoolsMap[subgraphPool.id];
    })
    .map(subgraphPool => {
      return Object.assign(subgraphPool, {
        chainId,
      });
    });

  const allPools: Partial<Pool>[] = pools.concat(subgraphPoolsMissingFromSor);

  return allPools;
}

export function sanitizePools(pools: Partial<Pool>[]): Partial<Pool>[] {
  return pools.map(pool => {
    /* Move totalLiquidity to graphData to save it for later comparison */
    pool.graphData = {
      totalLiquidity: pool.totalLiquidity.toString(),
    };
    /* Delete totalLiquidity so that it doesn't overwrite calculated API calculated liquidity */
    delete pool.totalLiquidity;
    return pool;
  });
}

export async function removeKnownTokens(
  chainId: number,
  tokenAddresses: string[]
): Promise<string[]> {
  const addressesWithNoInfo = await Promise.all(
    tokenAddresses.map(async tokenAddress => {
      const hasInfo = await getToken(chainId, tokenAddress);
      if (hasInfo) return null;
      return tokenAddress;
    })
  );
  return addressesWithNoInfo.filter(tokenAddress => tokenAddress != null);
}

export async function fetchTokens(
  chainId: number,
  tokenAddresses: string[]
): Promise<Token[]> {
  const infuraUrl = getRpcUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const tokens = await Promise.all(
    tokenAddresses.map(tokenAddress =>
      getTokenInfo(provider, chainId, tokenAddress)
    )
  );

  return tokens;
}
