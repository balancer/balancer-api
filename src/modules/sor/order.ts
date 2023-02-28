import { BatchSwap, buildRelayerCalls, canUseJoinExit, someJoinExit, SwapInfo, Swaps, SwapType } from '@balancer-labs/sdk';
import config  from '@/config';
import { getPools } from '@/modules/dynamodb';
import { convertPoolToSubgraphPoolBase } from '@/modules/pools';
import { convertSwapInfoToBatchSwap } from './batch-swap';
import { getSorSwap, orderKindToSwapType, sdkToSorSwapType } from './sor';
import { SorRequest, SorOrderResponse, PriceResponse, SorError } from './types';
import { SOR_DEFAULT_SLIPPAGE } from '@/constants';

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
    const subgraphPools = pools.map(pool =>
      convertPoolToSubgraphPoolBase(pool)
    );
    const hasJoinExit = someJoinExit(subgraphPools, swapInfo.swaps, swapInfo.tokenAddresses);
    console.log("Has join exit: ", hasJoinExit);
    if (hasJoinExit) {
      // Convert slippage to basis points as that's what the SDK expects
      const slippageBps = (slippagePercentage * 10_000).toString();
      console.log("Relayer data: ")
      console.log(subgraphPools);
      console.log(request.sender, config[networkId].addresses.batchRelayerV4, config[networkId].addresses.wrappedNativeAsset, slippageBps)
      const relayerCallData = buildRelayerCalls(
        swapInfo,
        subgraphPools,
        request.sender,
        config[networkId].addresses.batchRelayerV4,
        config[networkId].addresses.wrappedNativeAsset,
        slippageBps,
        undefined
      );

      priceResponse.allowanceTarget = config[networkId].addresses.vault;

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

// function createUserRelayerApprovalSignature(networkId: number, ) {
//   const deadline = calculateDeadlineExpiry(30);
//   const vaultAddress = config[networkId].addresses.vault;
//   const relayerAddress = config[networkId].addresses.batchRelayerV4;
//   const vaultContract = new Contract(vaultAddress, Vault__factory.abi, signer);
// }