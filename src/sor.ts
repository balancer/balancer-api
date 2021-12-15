import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubgraphPoolBase, SwapOptions } from "@balancer-labs/sor";
import { Order, Token, Pool, SerializedSwapInfo } from "./types";
import { 
  getTokenInfo, 
  orderKindToSwapType,
  getInfuraUrl,
  getTheGraphURL
} from "./utils";
import { getPools, getToken, getTokens } from "./dynamodb";
import fetch from 'isomorphic-fetch';
import { BigNumber } from '@ethersproject/bignumber';

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

function serializeSwapInfo(swapInfo: SwapInfo): SerializedSwapInfo {
  const serializedSwapInfo: SerializedSwapInfo = {
    tokenAddresses: swapInfo.tokenAddresses,
    swaps: swapInfo.swaps,
    swapAmount: swapInfo.swapAmount.toString(),
    swapAmountForSwaps: swapInfo.swapAmountForSwaps ? swapInfo.swapAmountForSwaps.toString() : '',
    returnAmount: swapInfo.returnAmount.toString(),
    returnAmountFromSwaps: swapInfo.returnAmountFromSwaps ? swapInfo.returnAmountFromSwaps.toString() : '',
    returnAmountConsideringFees: swapInfo.returnAmountConsideringFees.toString(),
    tokenIn: swapInfo.tokenIn,
    tokenOut: swapInfo.tokenOut,
    marketSp: swapInfo.marketSp
  };

  return serializedSwapInfo;
}

export async function getSorSwap(chainId: number, order: Order): Promise<SerializedSwapInfo> {
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

  const { sellToken, buyToken, orderKind, amount, gasPrice } = order;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  log(`Sell token details for token ${chainId} ${sellToken}: ${JSON.stringify(sellTokenDetails)}`)
  const buyTokenDetails: Token = await getToken(chainId, buyToken);
  log(`Buy token details for token ${chainId} ${buyToken}: ${JSON.stringify(buyTokenDetails)}`)


  if (sellTokenDetails) {
    sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, sellTokenDetails.price);
  }

  if (buyTokenDetails) {
    sor.swapCostCalculator.setNativeAssetPriceInToken(buyToken, buyTokenDetails.price);
  }

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  const swapOptions = { 
    gasPrice: BigNumber.from(gasPrice)
  };

  await sor.fetchPools(pools, false);

  const buyTokenSymbol = buyTokenDetails ? buyTokenDetails.symbol : buyToken;
  const sellTokenSymbol = sellTokenDetails ? sellTokenDetails.symbol : sellToken;

  log(
    `${orderKind}ing ${amount} ${sellTokenSymbol}` +
      ` for ${buyTokenSymbol}`
  );
  log(orderKind);
  log(`Token In: ${tokenIn}`);
  log(`Token Out: ${tokenOut}`);
  log(`Amount: ${amount}`);
  const swapInfo = await sor.getSwaps(
    sellToken,
    buyToken,
    swapType,
    amount,
    swapOptions
  );

  log(`SwapInfo: ${JSON.stringify(swapInfo)}`);
  log(swapInfo.swaps);
  log(swapInfo.tokenAddresses);
  log(swapInfo.returnAmount.toString());

  const serializedSwapInfo = serializeSwapInfo(swapInfo);
  log(`Serialized SwapInfo: ${JSON.stringify(swapInfo)}`);

  return serializedSwapInfo;
}

