
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK } from '@balancer-labs/sdk';
import { getToken } from './dynamodb';
import { Pool, Token } from '../types';
import { 
  getTokenInfo, 
  getInfuraUrl,
} from "../utils";

export async function fetchPoolsFromChain(chainId: number): Promise<Pool[]> {
  const infuraUrl = getInfuraUrl(chainId);

  // Uses default PoolDataService to retrieve onChain data
  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: infuraUrl
  });

  await balancer.sor.fetchPools();
  const pools: Pool[] = balancer.sor.getPools().map((sorPool) => {
    return Object.assign({totalLiquidity: '0'}, sorPool, {chainId});
  });
  return pools;
}

export function sanitizePools(pools: Pool[]): Pool[] {
  return pools.map((pool) => {
    /* Move totalLiquidity to graphData to save it for later comparison */
    pool.graphData = {
      totalLiquidity: pool.totalLiquidity
    };
    /* Delete totalLiquidity so that it doesn't overwrite calculated API calculated liquidity */
    delete pool.totalLiquidity
    return pool;
  });
}

export async function removeKnownTokens(chainId: number, tokenAddresses: string[]): Promise<string[]> {
  const addressesWithNoInfo = await Promise.all(tokenAddresses.map(async (tokenAddress) => {
    const hasInfo = await getToken(chainId, tokenAddress)
    if (hasInfo) return null;
    return tokenAddress;
  }));
  return addressesWithNoInfo.filter((tokenAddress) => tokenAddress != null);
}

export async function fetchTokens(chainId: number, tokenAddresses: string[]): Promise<Token[]> {
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const tokens = await Promise.all(
    tokenAddresses.map(
      (tokenAddress) => getTokenInfo(provider, chainId, tokenAddress)
    )
  );

  return tokens;
}