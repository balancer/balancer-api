import { BatchSwap, buildRelayerCalls, canUseJoinExit, someJoinExit, SubgraphPoolBase, SwapInfo, Swaps, SwapType } from '@balancer-labs/sdk';
import config  from '@/config';
import { getPools } from '@/modules/dynamodb';
import { convertSwapInfoToBatchSwap } from './batch-swap';
import { getSorSwap, orderKindToSwapType, sdkToSorSwapType } from './sor';
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

  const priceResponse: PriceResponse = {
    sellAmount: swapInfo.swapAmount,
    buyAmount: swapInfo.returnAmount,
    allowanceTarget: config[networkId].addresses.vault,
    price: swapInfo.marketSp,
  };

  console.log("Creating sor order with request: ", request);
  console.log("Swap info: ", swapInfo);

  const joinExitAvailable = canUseJoinExit(sdkToSorSwapType(swapType), request.sellToken, request.buyToken);

  console.log("Join exit available: ", joinExitAvailable);

  if (joinExitAvailable) {
    const pools = await getPools(networkId);
    const hasJoinExit = someJoinExit(pools as SubgraphPoolBase[], swapInfo.swaps, swapInfo.tokenAddresses);

    console.log("Has join exits: ", hasJoinExit);
    if (hasJoinExit) {
      // Convert slippage to basis points as that's what the SDK expects
      const slippageBps = (request.slippagePercentage * 10_000).toString();
      const relayerCallData = buildRelayerCalls(
        swapInfo,
        pools as SubgraphPoolBase[],
        request.sender,
        config[networkId].addresses.batchRelayerV3,
        config[networkId].addresses.wrappedNativeAsset,
        slippageBps,
        undefined
      );

      priceResponse.allowanceTarget = config[networkId].addresses.batchRelayerV3;

      console.log('Relayer going to: ', relayerCallData.to);

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
    request.slippagePercentage
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
    throw new Error(
      'To create a SOR order you must pass a sender address in the request'
    );
  }

  if (request.slippagePercentage && (request.slippagePercentage < 0 || request.slippagePercentage > 1)) {
    throw new Error('Invalid slippage percentage. Must be 0 < n < 1.');
  }
}