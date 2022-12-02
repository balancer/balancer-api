import { getChangedPools, getTokenAddressesFromPools } from '../utils';
import { getPools, getTokens, updatePools, updateTokens } from '../data-providers/dynamodb';
import { PoolDecorator } from '../pools/pool.decorator';
import {
  fetchPoolsFromChain,
  fetchTokens,
  removeKnownTokens,
  sanitizePools,
} from '../data-providers/onchain';

const { CHAIN_ID } = process.env;

export const handler = async (): Promise<any> => {
  const log = console.log;

  const chainId = parseInt(CHAIN_ID || '1');

  try {
    log(`Loading Pools from chain, DB and Tokens. Network: ${chainId}`);
    const [poolsFromChain, currentPools, currentTokens] = await Promise.all([
      fetchPoolsFromChain(chainId),
      getPools(chainId),
      getTokens(chainId),
    ]);
    log(`Sanitizing ${poolsFromChain.length} pools`);
    const pools = sanitizePools(poolsFromChain);
    const changedPools = getChangedPools(pools, currentPools);
    log(`Found ${changedPools.length} pools have changed. Decorating these pools.`);
    const poolDecorator = new PoolDecorator(pools, { poolsToDecorate: changedPools, chainId: chainId });
    const decoratedPools = await poolDecorator.decorate(currentTokens);
    log(`Decorated ${decoratedPools.length} pools`);
    log(`Saving ${changedPools.length} pools for chain ${chainId} to database`);
    await updatePools(changedPools);
    log(`Saved pools. Fetching Tokens for pools`);
    const tokenAddresses = getTokenAddressesFromPools(changedPools);
    log(
      `Found ${tokenAddresses.length} tokens in pools on chain ${chainId}. Filtering by known tokens`
    );
    const filteredTokenAddresses = await removeKnownTokens(
      chainId,
      tokenAddresses
    );
    log(
      `Fetching ${filteredTokenAddresses.length} tokens for chain ${chainId}`
    );
    const tokens = await fetchTokens(chainId, filteredTokenAddresses);
    const tokenUpdateResult = await updateTokens(tokens);
    log(`Token update result: ${tokenUpdateResult}`);
    log(`Saved ${filteredTokenAddresses.length} Tokens`);
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    log(`Received db error: ${dbError}`);
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
