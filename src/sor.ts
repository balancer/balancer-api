import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK, SwapInfo } from '@balancer-labs/sdk';
import { Order, Token, Pool, SerializedSwapInfo } from "./types";
import { 
  getTokenInfo, 
  orderKindToSwapType,
  getInfuraUrl,
} from "./utils";
import { getToken } from "./dynamodb";
import { BigNumber } from '@ethersproject/bignumber';
import { DatabasePoolDataService } from './poolDataService';

const log = console.log;

export async function fetchPoolsFromChain(chainId: number): Promise<Pool[]> {
  const infuraUrl = getInfuraUrl(chainId);

  // Uses default PoolDataService to retrieve onChain data
  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: infuraUrl
  });

  await balancer.sor.fetchPools();
  const pools: Pool[] = balancer.sor.getPools().map((pool) => {
    return Object.assign({totalLiquidity: '0'}, pool, {chainId});
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

  const tokens = await Promise.all(
    tokenAddresses.map(
      (tokenAddress) => getTokenInfo(provider, chainId, tokenAddress)
    )
  );

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

  // SDK/SOR will use this to retrieve pool list from db (default uses onchain call which will be slow)
  const dbPoolDataService = new DatabasePoolDataService({
    chainId: chainId,
  });
  
  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: infuraUrl,
    sor: {
      poolDataService: dbPoolDataService
    },
  });

  const { sellToken, buyToken, orderKind, amount, gasPrice } = order;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  log(`Sell token details for token ${chainId} ${sellToken}: ${JSON.stringify(sellTokenDetails)}`)
  const buyTokenDetails: Token = await getToken(chainId, buyToken);
  log(`Buy token details for token ${chainId} ${buyToken}: ${JSON.stringify(buyTokenDetails)}`)


  if (sellTokenDetails) {
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, sellTokenDetails.price);
  } else {
    log(`No price found for token ${sellToken}. Defaulting to 0.`)
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, '0');
  }

  if (buyTokenDetails) {
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(buyToken, buyTokenDetails.price);
  } else {
    log(`No price found for token ${buyToken}. Defaulting to 0.`)
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(buyToken, '0');
  }

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  const swapOptions = { 
    gasPrice: BigNumber.from(gasPrice)
  };

  await balancer.sor.fetchPools();

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
  const swapInfo = await balancer.sor.getSwaps(
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

