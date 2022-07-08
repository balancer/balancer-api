import { BalancerSDK, SwapInfo } from '@balancer-labs/sdk';
import { Order, Token, SerializedSwapInfo } from "./types";
import { 
  orderKindToSwapType,
  getInfuraUrl,
  getNativeAssetPriceSymbol,
} from "./utils";
import { getToken } from "./data-providers/dynamodb";
import { BigNumber } from '@ethersproject/bignumber';
import { DatabasePoolDataService } from './poolDataService';

const log = console.log;

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

  const nativeAssetPriceSymbol = getNativeAssetPriceSymbol(chainId);

  if (sellTokenDetails && sellTokenDetails.price[nativeAssetPriceSymbol]) {
    const priceOfNativeAssetInToken = BigNumber.from('1').div(sellTokenDetails.price[nativeAssetPriceSymbol]);
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, priceOfNativeAssetInToken.toString());
  } else {
    log(`No price found for token ${sellToken}. Defaulting to 0.`)
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(sellToken, '0');
  }

  if (buyTokenDetails && buyTokenDetails.price[nativeAssetPriceSymbol]) {
    const priceOfNativeAssetInToken = BigNumber.from('1').div(buyTokenDetails.price[nativeAssetPriceSymbol]);
    balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(buyToken, priceOfNativeAssetInToken.toString());
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

