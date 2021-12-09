import { Network } from "../src/types";
import { getTokenAddressesFromPools } from "../src/utils";
import { updatePools, updateTokens } from "../src/dynamodb";
import { fetchPoolsFromChain, fetchTokens, removeKnownTokens } from "../src/sor";

export const handler = async (event: any = {}): Promise<any> => {
  const log = console.log;

  let chainId = Network.MAINNET;

  if (event.body) {
    const eventBody = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
    chainId = eventBody.chainId ? Number(eventBody.chainId) : Network.MAINNET;
    if (!Object.values(Network).includes(chainId)) {
      return { statusCode: 400, body: 'Invalid ChainID'}
    }
  }

  try {
    log(`Fetching pools from chain ${chainId}`)
    const pools = await fetchPoolsFromChain(chainId);
    log(`Saving ${pools.length} pools for chain ${chainId} to database`);
    await updatePools(pools);
    log(`Saved pools. Fetching Tokens for pools`);
    const tokenAddresses = getTokenAddressesFromPools(pools);
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
