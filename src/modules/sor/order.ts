import { BatchSwap, SwapInfo, Swaps, SwapType } from '@balancer-labs/sdk';
import { ADDRESSES } from '@/constants/addresses';
import { convertSwapInfoToBatchSwap } from './batch-swap';
import { getSorSwap, orderKindToSwapType } from './sor';
import { SorRequest, SorOrderResponse, PriceResponse } from './types';

/**
 * Takes a SOR request and returns a SorOrder which contains a transaction that
 * the user can send to the chain.
 */
export async function createSorOrder(
  networkId: number,
  request: SorRequest
): Promise<SorOrderResponse> {
  validateSorRequest(request);

  const swapInfo: SwapInfo = await getSorSwap(networkId, request);
  const swapType: SwapType = orderKindToSwapType(request.orderKind);
  const batchSwap: BatchSwap = convertSwapInfoToBatchSwap(
    request.sender,
    swapType,
    swapInfo,
    request.slippagePercentage
  );
  const encodedBatchSwapData = Swaps.encodeBatchSwap(batchSwap);

  const priceResponse: PriceResponse = {
    sellAmount: swapInfo.swapAmount,
    buyAmount: swapInfo.returnAmount,
    allowanceTarget: ADDRESSES[networkId].contracts.vault,
    price: swapInfo.marketSp,
  };

  return {
    price: priceResponse,
    to: ADDRESSES[networkId].contracts.vault,
    data: encodedBatchSwapData,
    value: '0',
  };
}

function validateSorRequest(request: SorRequest){
  if (!request.sender) {
    throw new Error(
      'To create a SOR order you must pass a sender address in the request'
    );
  }

  if (request.slippagePercentage && (request.slippagePercentage < 0 || request.slippagePercentage > 1)) {
    throw new Error('Invalid slippage percentage. Must be 0 < n < 1.');
  }
}
