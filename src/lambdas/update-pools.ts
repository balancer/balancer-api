import { getDefaultTokensForChain, getTokenAddressesFromPools } from "../utils";
import { updatePools, updateTokens } from "../data-providers/dynamodb";
import { fetchPoolsFromChain, fetchTokens, removeKnownTokens, sanitizePools } from "../data-providers/onchain";

const { CHAIN_ID } = process.env;

export const handler = async (): Promise<any> => {
  const log = console.log;

  const chainId = parseInt(CHAIN_ID || '1');

  try {
    log(`Fetching pools from network ${chainId}`)
    const poolsFromChain = await fetchPoolsFromChain(chainId);
    log(`Sanitizing ${poolsFromChain.length} pools`);
    const pools = sanitizePools(poolsFromChain);
    log(`Saving ${pools.length} pools for chain ${chainId} to database`);
    await updatePools(pools);
    log(`Saved pools. Fetching Tokens for pools`);
    const defaultTokens = getDefaultTokensForChain(chainId);
    const tokensFromPools = getTokenAddressesFromPools(pools);
    const tokenAddresses = [...defaultTokens, ...tokensFromPools];
    log(`Found ${tokenAddresses.length} tokens in pools on chain ${chainId}. Filtering by known tokens`);
    const filteredTokenAddresses = await removeKnownTokens(chainId, tokenAddresses);
    log(`Fetching ${filteredTokenAddresses.length} tokens for chain ${chainId}`);
    const tokens = await fetchTokens(chainId, filteredTokenAddresses);
    await updateTokens(tokens);
    log(`Saved ${filteredTokenAddresses.length} Tokens`);
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    log(`Received db error: ${dbError}`);
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
