import { wrapHandler } from '../plugins/sentry';
import { captureException } from '@sentry/serverless';
import { getChangedPools, getTokenAddressesFromPools } from '../utils';
import {
  getPools,
  updatePools,
  updateTokens,
} from '../data-providers/dynamodb';
import {
  fetchPoolsFromChain,
  fetchTokens,
  removeKnownTokens,
  sanitizePools,
} from '../data-providers/onchain';

const { CHAIN_ID } = process.env;

export const handler = wrapHandler(async (): Promise<any> => {
  const log = console.log;

  const chainId = parseInt(CHAIN_ID || '1');

  let didError = false;
  let changedPools = [];

  try {
    log(`Loading Pools from chain, DB and Tokens. Network: ${chainId}`);
    const [poolsFromChain, currentPools] = await Promise.all([
      fetchPoolsFromChain(chainId),
      getPools(chainId),
    ]);
    log(`Sanitizing ${poolsFromChain.length} pools`);
    const pools = sanitizePools(poolsFromChain);
    changedPools = getChangedPools(pools, currentPools);
    log(`Saving ${changedPools.length} pools for chain ${chainId} to database`);
    await updatePools(changedPools);
  } catch (e) {
    captureException(e);
    log(`Received db error updating pools: ${e}`);
    didError = true;
  }

  try {
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
    await updateTokens(tokens);
    log(`Saved ${filteredTokenAddresses.length} Tokens`);
  } catch (e) {
    captureException(e);
    log(`Received db error updating tokens: ${e}`);
    didError = true;
  }

  if (didError) {
    return { statusCode: 500, body: 'Error' };
  }

  return { statusCode: 200, body: '' };
});
