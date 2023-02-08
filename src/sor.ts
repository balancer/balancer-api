import { BalancerSDK, SwapInfo } from '@balancer-labs/sdk';
import { SorRequest, Token, SerializedSwapInfo } from './types';
import {
  orderKindToSwapType,
  getInfuraUrl,
  getNativeAssetPriceSymbol,
} from './utils';
import { getToken } from './data-providers/dynamodb';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { DatabasePoolDataService } from 'poolDataService';
import debug from 'debug';

let log = debug('balancer:sor');

export function _setLogger(logger) {
  log = logger;
}

function serializeSwapInfo(swapInfo: SwapInfo): SerializedSwapInfo {
  const serializedSwapInfo: SerializedSwapInfo = {
    tokenAddresses: swapInfo.tokenAddresses,
    swaps: swapInfo.swaps,
    swapAmount: swapInfo.swapAmount.toString(),
    swapAmountForSwaps: swapInfo.swapAmountForSwaps
      ? swapInfo.swapAmountForSwaps.toString()
      : '',
    returnAmount: swapInfo.returnAmount.toString(),
    returnAmountFromSwaps: swapInfo.returnAmountFromSwaps
      ? swapInfo.returnAmountFromSwaps.toString()
      : '',
    returnAmountConsideringFees:
      swapInfo.returnAmountConsideringFees.toString(),
    tokenIn: swapInfo.tokenIn,
    tokenOut: swapInfo.tokenOut,
    marketSp: swapInfo.marketSp,
  };

  return serializedSwapInfo;
}

interface SorSwapOptions {
  useDb?: boolean;
  minLiquidity?: string;
}

export async function getSorSwap(
  chainId: number,
  order: SorRequest,
  options: SorSwapOptions,
): Promise<SerializedSwapInfo> {
  log(`Getting swap: ${JSON.stringify(order)}`);
  const infuraUrl = getInfuraUrl(chainId);

  const useDb = options.useDb || false;
  const minLiquidity = options.minLiquidity;

  let sorSettings;
  if (useDb) {
    log("Using DynamoDB for SOR data");

    // SDK/SOR will use this to retrieve pool list from db (default uses onchain call which will be slow)
    const dbPoolDataService = new DatabasePoolDataService({
      chainId,
      minLiquidity
    });

    sorSettings = {
      poolDataService: dbPoolDataService
    }
  }

  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: infuraUrl,
    sor: sorSettings,
  });

  const { sellToken, buyToken, orderKind, amount, gasPrice } = order;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  log(
    `Sell token details for token ${chainId} ${sellToken}: ${JSON.stringify(
      sellTokenDetails
    )}`
  );
  const buyTokenDetails: Token = await getToken(chainId, buyToken);
  log(
    `Buy token details for token ${chainId} ${buyToken}: ${JSON.stringify(
      buyTokenDetails
    )}`
  );

  const nativeAssetPriceSymbol = getNativeAssetPriceSymbol(chainId);

  let priceOfNativeAssetInSellToken = 0;
  if (sellTokenDetails && sellTokenDetails.price) {
    if (typeof sellTokenDetails.price !== 'object') {
      priceOfNativeAssetInSellToken = sellTokenDetails.price;
    } else if (sellTokenDetails.price[nativeAssetPriceSymbol]) {
      priceOfNativeAssetInSellToken = Number(
        formatFixed(
          parseFixed('1', 72).div(
            parseFixed(sellTokenDetails.price[nativeAssetPriceSymbol], 36)
          ),
          36
        )
      );
    }
  }
  log(`Price of sell token ${sellToken}: `, priceOfNativeAssetInSellToken);
  balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(
    sellToken,
    priceOfNativeAssetInSellToken.toString()
  );

  let priceOfNativeAssetInBuyToken = 0;
  if (buyTokenDetails && buyTokenDetails.price) {
    if (typeof buyTokenDetails.price !== 'object') {
      priceOfNativeAssetInBuyToken = buyTokenDetails.price;
    } else if (buyTokenDetails.price[nativeAssetPriceSymbol]) {
      priceOfNativeAssetInBuyToken = Number(
        formatFixed(
          parseFixed('1', 72).div(
            parseFixed(buyTokenDetails.price[nativeAssetPriceSymbol], 36)
          ),
          36
        )
      );
    }
  }
  log(`Price of buy token ${buyToken}: `, priceOfNativeAssetInBuyToken);
  balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(
    buyToken,
    priceOfNativeAssetInBuyToken.toString()
  );

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  const swapOptions = {
    gasPrice: BigNumber.from(gasPrice),
  };

  await balancer.sor.fetchPools();

  const buyTokenSymbol = buyTokenDetails ? buyTokenDetails.symbol : buyToken;
  const sellTokenSymbol = sellTokenDetails
    ? sellTokenDetails.symbol
    : sellToken;

  log(
    `${orderKind}ing ${amount} ${sellTokenSymbol}` + ` for ${buyTokenSymbol}`
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
