import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubgraphPoolBase } from "@balancer-labs/sor";
import { Order, Token, Pool } from "./types";
import { 
  getTokenInfo, 
  orderKindToSwapType,
  getInfuraUrl,
  getTheGraphURL,
  getPlatformId,
  getNativeAssetId
} from "./utils";
import { getPools, getToken, getTokens } from "./dynamodb";
import fetch from 'isomorphic-fetch';

const log = console.log;

export async function fetchPoolsFromChain(chainId: number): Promise<Pool[]> {
  const poolsSource = getTheGraphURL(chainId);
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const sor = new SOR(
    provider,
    chainId,
    poolsSource
  );

  await sor.fetchPools();  
  const pools: Pool[] = sor.getPools().map((pool) => {
    return Object.assign({}, pool, {chainId});
  });
  return pools;
}

export async function removeKnownTokens(chainId: number, tokenAddresses: string[]): Promise<string[]> {
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const addressesWithNoInfo = await Promise.all(tokenAddresses.map(async (tokenAddress) => {
    const hasInfo = await getTokenInfo(provider, chainId, tokenAddress)
    if (hasInfo) return null;
    return tokenAddress;
  }));
  return addressesWithNoInfo.filter((tokenAddress) => tokenAddress != null);
}

export async function fetchTokens(chainId: number, tokenAddresses: string[]): Promise<Token[]> {
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const tokens: Token[] = await Promise.all(tokenAddresses.map((tokenAddress) => {
    return getTokenInfo(provider, chainId, tokenAddress);
  }));

  return tokens;
}

export async function getSorSwap(chainId: number, order: Order): Promise<SwapInfo> {
  log(`Getting swap: ${JSON.stringify(order)}`);
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);
  const pools: SubgraphPoolBase[] = await getPools(chainId);

  const sor = new SOR(
    provider,
    chainId,
    null,
    pools
  );

  const tokens = await getTokens();
  console.log("All tokens: ", tokens);

  const { sellToken, buyToken, orderKind, amount } = order;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  const buyTokenDetails: Token = await getToken(chainId, buyToken);

  sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, sellTokenDetails.price);
  sor.swapCostCalculator.setNativeAssetPriceInToken(buyToken, buyTokenDetails.price);

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  await sor.fetchPools(pools, false);

  log(
    `${orderKind}ing ${amount} ${sellTokenDetails.symbol}` +
      ` for ${buyTokenDetails.symbol}`
  );
  log(orderKind);
  log(`Token In: ${tokenIn}`);
  log(`Token Out: ${tokenOut}`);
  log(`Amount: ${amount}`);
  const swapInfo = await sor.getSwaps(
    sellToken,
    buyToken,
    swapType,
    amount
  );

  log(`SwapInfo: ${JSON.stringify(swapInfo)}`);
  log(swapInfo.swaps);
  log(swapInfo.tokenAddresses);
  log(swapInfo.returnAmount.toString());
  return swapInfo;
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

    const data = await response.json();

    if (data[tokenAddress.toLowerCase()][nativeAssetId] === undefined)
        throw Error('No price returned from Coingecko');

    return data[tokenAddress.toLowerCase()][nativeAssetId];
}
