import { BigNumber } from 'ethers';
import {
  Address,
  BatchSwap,
  SwapInfo,
  SwapType,
} from '@balancer-labs/sdk';
import { SwapTokenType, SwapToken } from '@/modules/tokens';

function calculateLimits(
  tokensIn: SwapToken[],
  tokensOut: SwapToken[],
  tokenAddresses: string[],
  slippageBps = 10, // 0.1% slippage
): string[] {
  const limits: string[] = [];

  tokenAddresses.forEach((token, i) => {
    const tokenIn = tokensIn.find(
      swapToken => token.toLowerCase() === swapToken.address.toLowerCase()
    );
    const tokenOut = tokensOut.find(
      swapToken => token.toLowerCase() === swapToken.address.toLowerCase()
    );
    if (tokenIn) {
      limits[i] = BigNumber.from(tokenIn.amount).mul(10000 + slippageBps).div(10000).toString();
    } else if (tokenOut) {
      limits[i] = BigNumber.from(tokenOut.amount).mul(-10000).div(10000 + slippageBps).toString();
    } else {
      limits[i] = '0';
    }
  });

  return limits;
}

export function convertSwapInfoToBatchSwap(
  userAddress: Address,
  swapType: SwapType,
  swapInfo: SwapInfo
): BatchSwap {
  const tokenIn: SwapToken = {
    address: swapInfo.tokenIn,
    amount: BigNumber.from(swapInfo.swapAmount),
    type: SwapTokenType.max,
  };
  const tokenOut: SwapToken = {
    address: swapInfo.tokenOut,
    amount: BigNumber.from(swapInfo.returnAmount),
    type: SwapTokenType.min,
  };
  const limits = calculateLimits(
    [tokenIn],
    [tokenOut],
    swapInfo.tokenAddresses
  );

  const batchSwapData: BatchSwap = {
    kind: swapType,
    swaps: swapInfo.swaps,
    assets: swapInfo.tokenAddresses,
    funds: {
      fromInternalBalance: false,
      sender: userAddress,
      recipient: userAddress,
      toInternalBalance: false,
    },
    limits: limits,
    deadline: '999999999999999999',
  };

  return batchSwapData;
}

