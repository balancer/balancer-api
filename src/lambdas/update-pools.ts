import { getTokenAddressesFromPools } from "../utils";
import { updatePools, updateTokens } from "../data-providers/dynamodb";
import { fetchPoolsFromChain, fetchTokens, removeKnownTokens, sanitizePools } from "../data-providers/onchain";

const { NETWORK_ID } = process.env;

export const handler = async (): Promise<any> => {
  const log = console.log;

  const networkId = parseInt(NETWORK_ID || '1');

  try {
    log(`Fetching pools from network ${networkId}`)
    const poolsFromChain = await fetchPoolsFromChain(networkId);
    log(`Sanitizing ${poolsFromChain.length} pools`);
    const pools = sanitizePools(poolsFromChain);
    log(`Saving ${pools.length} pools for network ${networkId} to database`);
    await updatePools(pools);
    log(`Saved pools. Fetching Tokens for pools`);
    const tokenAddresses = getTokenAddressesFromPools(pools);
    log(`Found ${tokenAddresses.length} tokens in pools on network ${networkId}. Filtering by known tokens`);
    const filteredTokenAddresses = await removeKnownTokens(networkId, tokenAddresses);
    log(`Fetching ${filteredTokenAddresses.length} tokens for network ${networkId}`);
    const tokens = await fetchTokens(networkId, filteredTokenAddresses);
    await updateTokens(tokens);
    log(`Saved ${filteredTokenAddresses.length} Tokens`);
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    log(`Received db error: ${dbError}`);
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
