import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubgraphPoolBase } from "@balancer-labs/sor";
import { Order, Token, Pool } from "./types";
import { 
  getTokenInfo, 
  orderKindToSwapType,
  getInfuraUrl,
  getTheGraphURL
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

  const { sellToken, buyToken, orderKind, amount } = order;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  log(`Got sell token details for token ${chainId} ${sellToken}: ${JSON.stringify(sellTokenDetails)}`)
  const buyTokenDetails: Token = await getToken(chainId, buyToken);
  log(`Got buy token details for token ${chainId} ${buyToken}: ${JSON.stringify(buyTokenDetails)}`)

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

