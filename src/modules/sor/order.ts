import debug from 'debug';
import { BatchSwap, buildRelayerCalls, canUseJoinExit, someJoinExit, SwapInfo, Swaps, SwapType } from '@balancer-labs/sdk';
import config  from '@/config';
import { getPools } from '@/modules/dynamodb';
import { convertPoolToSubgraphPoolBase } from '@/modules/pools';
import { convertSwapInfoToBatchSwap } from './batch-swap';
import { getSorSwap, orderKindToSwapType, sdkToSorSwapType } from './sor';
import { SorRequest, SorOrderResponse, PriceResponse, SorError } from './types';
import { SOR_DEFAULT_SLIPPAGE } from '@/constants';

const log = debug('balancer:sor');

/**
 * Takes a SOR request and returns a SorOrder which contains a transaction that
 * the user can send to the chain.
 */
export async function createSorOrder(
  networkId: number,
  request: SorRequest
): Promise<SorOrderResponse> {
  validateSorRequest(request);

  const slippagePercentage = request.slippagePercentage ?? SOR_DEFAULT_SLIPPAGE;

  const swapInfo: SwapInfo = await getSorSwap(networkId, request, { useJoinExitSwaps: true });
  const swapType: SwapType = orderKindToSwapType(request.orderKind);

  const priceResponse: PriceResponse = {
    sellAmount: swapType === SwapType.SwapExactIn ? swapInfo.swapAmount : swapInfo.returnAmount,
    buyAmount: swapType === SwapType.SwapExactIn ? swapInfo.returnAmount : swapInfo.swapAmount,
    allowanceTarget: config[networkId].addresses.vault,
    price: swapInfo.marketSp,
  };

  const joinExitAvailable = canUseJoinExit(sdkToSorSwapType(swapType), request.sellToken, request.buyToken);

  log("Join exit available: ", joinExitAvailable);

  if (joinExitAvailable) {
    const pools = await getPools(networkId);
    const subgraphPools = pools.map(pool =>
      convertPoolToSubgraphPoolBase(pool)
    );
    const hasJoinExit = someJoinExit(subgraphPools, swapInfo.swaps, swapInfo.tokenAddresses);
    log("Has join exit: ", hasJoinExit);
    if (hasJoinExit) {
      // Convert slippage to basis points as that's what the SDK expects
      const slippageBps = (slippagePercentage * 10_000).toString();
      const relayerCallData = buildRelayerCalls(
        swapInfo,
        subgraphPools,
        request.sender,
        config[networkId].addresses.batchRelayer,
        config[networkId].addresses.wrappedNativeAsset,
        slippageBps,
        undefined
      );

      priceResponse.allowanceTarget = config[networkId].addresses.vault;

      return {
        price: priceResponse,
        to: relayerCallData.to,
        data: relayerCallData.data,
        value: '0'
      }
    }
  }

  const batchSwap: BatchSwap = convertSwapInfoToBatchSwap(
    swapType,
    swapInfo,
    request.sender,
    request.recipient || request.sender,
    slippagePercentage
  );
  const encodedBatchSwapData = Swaps.encodeBatchSwap(batchSwap);

  return {
    price: priceResponse,
    to: config[networkId].addresses.vault,
    data: encodedBatchSwapData,
    value: '0',
  };
}

function validateSorRequest(request: SorRequest){
  if (!request.sender) {
    throw new SorError(
      'To create a SOR order you must pass a sender address in the request'
    );
  }

  if (request.slippagePercentage) {
    if (typeof request.slippagePercentage !== 'number') {
      throw new SorError(
        'slippagePercentage must be a number'
      )
    }

    if ((request.slippagePercentage < 0 || request.slippagePercentage > 1)) {
      throw new SorError('Invalid slippage percentage. Must be 0 < n < 1.');
    }
  }
}