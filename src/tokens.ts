import { updateToken } from "./dynamodb";
import { getPlatformId, getNativeAssetId } from "./utils";

const log = console.log;

/**
 * @dev Assumes that the native asset has 18 decimals
 * @param chainId - the chain id on which the token is deployed
 * @param tokenAddress - the address of the token contract
 * @param tokenDecimals - the number of decimals places which the token is divisible by
 * @returns the price of 1 ETH in terms of the token base units
 */
 export async function getTokenPriceInNativeAsset(
  chainId: number,
  tokenAddress: string
): Promise<string> {
  const platformId = getPlatformId(chainId);
  const nativeAssetId = getNativeAssetId(chainId);
  const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${platformId}?contract_addresses=${tokenAddress}&vs_currencies=${nativeAssetId}`;

  const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
      },
  });

  if (response.status >= 300) {
    throw new Error(`Received ${response.status} status code from CoinGecko`);
  }

  const data = await response.json();

  if (data[tokenAddress.toLowerCase()][nativeAssetId] === undefined)
      throw new Error('No price returned from Coingecko');

  return data[tokenAddress.toLowerCase()][nativeAssetId];
}

export async function updateTokenPrices(tokens: any[]) {

  await Promise.all(tokens.map(async (token) => {
    try {
      const tokenPrice = await getTokenPriceInNativeAsset(token.chainId, token.address);
      token.price = tokenPrice;
      await updateToken(token);
      log(`Updated token ${token.symbol} to price ${token.price}`);
    } catch (e) {
      log(`Unable to fetch price data for token ${token.symbol}. Error is: ${JSON.stringify(e)}`);
    }
  }));
  log("Updated token prices");

}