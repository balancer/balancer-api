import { BalancerSDK, SwapInfo, SwapType, SwapTypes } from '@sobal/sdk';
import { SorRequest, SerializedSwapInfo } from './types';
import { Token } from '@/modules/tokens';
import {
  getRpcUrl,
  getSubgraphUrl,
  getNativeAssetPriceSymbol,
} from '@/modules/network';
import { getToken } from '@/modules/dynamodb';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { DatabasePoolDataService } from './pool-data-service';
import debug from 'debug';
import { SOR_MIN_LIQUIDITY } from '@/constants/general';

let log = debug('balancer:sor');

export function _setLogger(logger) {
  log = logger;
}

export function orderKindToSwapType(orderKind: string): SwapType {
  switch (orderKind) {
    case 'sell':
      return SwapType.SwapExactIn;
    case 'buy':
      return SwapType.SwapExactOut;
    default:
      throw new Error(`invalid order kind ${orderKind}`);
  }
}

export function sdkToSorSwapType(swapType: SwapType): SwapTypes {
  return swapType === SwapType.SwapExactIn
    ? SwapTypes.SwapExactIn
    : SwapTypes.SwapExactOut;
}

export function serializeSwapInfo(swapInfo: SwapInfo): SerializedSwapInfo {
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
  useJoinExitSwaps?: boolean;
  useDb?: boolean;
  minLiquidity?: string;
}

export async function getSorSwap(
  chainId: number,
  request: SorRequest,
  options: SorSwapOptions = {}
): Promise<SwapInfo> {
  log(`Getting swap: ${JSON.stringify(request)}`);
  const rpcUrl = getRpcUrl(chainId);
  const subgraphUrl = getSubgraphUrl(chainId);

  const useJoinExitSwaps = options.useJoinExitSwaps ?? false;
  const useDb = options.useDb ?? true;
  const minLiquidity = options.minLiquidity ?? SOR_MIN_LIQUIDITY;

  let sorSettings;
  if (useDb) {
    log('Using DynamoDB for SOR data.');
    log(`Minimum Liquidity: ${minLiquidity}`);

    // SDK/SOR will use this to retrieve pool list from db (default uses onchain call which will be slow)
    const dbPoolDataService = new DatabasePoolDataService({
      chainId,
      minLiquidity,
    });

    sorSettings = {
      poolDataService: dbPoolDataService,
    };
  }

  const balancer = new BalancerSDK({
    network: chainId,
    rpcUrl: rpcUrl,
    customSubgraphUrl: subgraphUrl,
    sor: sorSettings,
  });

  const { sellToken, buyToken, orderKind, amount, gasPrice } = request;

  const sellTokenDetails: Token = await getToken(chainId, sellToken);
  log(`Sell token details: ${JSON.stringify(sellTokenDetails)}`);
  const buyTokenDetails: Token = await getToken(chainId, buyToken);
  log(`Buy token details: ${JSON.stringify(buyTokenDetails)}`);

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
  log(
    `Price of ${sellToken} in native asset: ${priceOfNativeAssetInSellToken}`
  );
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
  log(`Price of ${buyToken} in native asset: ${priceOfNativeAssetInBuyToken}`);
  balancer.sor.swapCostCalculator.setNativeAssetPriceInToken(
    buyToken,
    priceOfNativeAssetInBuyToken.toString()
  );

  const swapType: SwapType = orderKindToSwapType(orderKind);
  const sorSwapType: SwapTypes = sdkToSorSwapType(swapType);

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
  const swapInfo = await balancer.sor.getSwaps(
    sellToken,
    buyToken,
    sorSwapType,
    amount,
    swapOptions,
    useJoinExitSwaps
  );

  log(`SwapInfo: ${JSON.stringify(swapInfo)}`);

  return swapInfo;
}
