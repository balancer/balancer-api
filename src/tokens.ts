import { updateToken } from "./dynamodb";
import { getPlatformId, getNativeAssetId } from "./utils";
import { Network, Token } from "./types";

const TOKEN_UPDATE_TIME = 60 * 15; // 5 Minutes
const TOKEN_RETRY_PRICE_DATA_TIME = 24 * 60 * 7; // 1 Week

const log = console.log;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  if (response.status === 429) {
    throw new Error('ratelimit');
  }

  if (response.status >= 300) {
    throw new Error(`Received ${response.status} status code from CoinGecko`);
  }

  const data = await response.json();

  if (data[tokenAddress.toLowerCase()][nativeAssetId] === undefined)
      throw new Error('No price returned from Coingecko');

  return data[tokenAddress.toLowerCase()][nativeAssetId];
}

export async function updateTokenPrices(tokens: Token[]) {

  await Promise.all(tokens.map(async (token, idx) => {
    try {
      if (token.chainId == Network.KOVAN) return;
      if (token.lastUpdate > Date.now() - TOKEN_UPDATE_TIME) return;
      if (token.noPriceData && token.lastUpdate > Date.now() - TOKEN_RETRY_PRICE_DATA_TIME) return;

      const sleepTime = idx * 200;
      await sleep(sleepTime);
      const tokenPrice = await getTokenPriceInNativeAsset(token.chainId, token.address);
      token.price = tokenPrice;
      await updateToken(token);
      log(`Updated token ${token.symbol} to price ${token.price}`);
    } catch (err) {
      log(`Unable to fetch price data for token ${token.symbol}. ChainID: ${token.chainId}, address ${token.address} Error is: ${err.message}`);
      if (err.message !== 'ratelimit') {
        log(`Marking token as having no price data`);
        token.noPriceData = true;
        await updateToken(token);
      }
    }
  }));
  log("Updated token prices");

}