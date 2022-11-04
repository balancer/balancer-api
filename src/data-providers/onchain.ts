import { JsonRpcProvider } from '@ethersproject/providers';
import { PoolsSubgraphRepository, PoolType } from '@balancer-labs/sdk';
import { getToken } from './dynamodb';
import { Pool, Token } from '../types';
import { getTokenInfo, getSubgraphURL, getInfuraUrl } from '../utils';

export async function fetchPoolsFromChain(chainId: number): Promise<Pool[]> {
  const subgraphPoolFetcher = new PoolsSubgraphRepository({
    url: getSubgraphURL(chainId),
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

  let pools: Pool[] = [];
  let subgraphPools = [];

  const first = 1000;
  let skip = 0;
  do {
    subgraphPools = await subgraphPoolFetcher.fetch({ first, skip });
    skip += first;

    pools = pools.concat(
      subgraphPools.map(subgraphPool => {
        return Object.assign({ totalLiquidity: '0', name: '' }, subgraphPool, {
          poolType: subgraphPool.poolType as PoolType,
          chainId,
        });
      })
    );
  } while (subgraphPools.length > 0);

  return pools;
}

export function sanitizePools(pools: Pool[]): Pool[] {
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
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const tokens = await Promise.all(
    tokenAddresses.map(tokenAddress =>
      getTokenInfo(provider, chainId, tokenAddress)
    )
  );

  return tokens;
}
