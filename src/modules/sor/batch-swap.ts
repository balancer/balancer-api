import { BigNumber, BigNumberish, parseFixed } from '@ethersproject/bignumber';
import { Address, BatchSwap, SwapInfo, SwapType } from '@sobal/sdk';
import { SOR_DEFAULT_SLIPPAGE } from '@/constants';
import { SwapTokenType, SwapToken } from '@/modules/tokens';
import { calculateDeadlineExpiry } from '@/modules/time';
import { SOR_DEADLINE } from '@/constants';

export function calculateLimits(
  tokensIn: SwapToken[],
  tokensOut: SwapToken[],
  tokenAddresses: string[],
  slippagePercentage = SOR_DEFAULT_SLIPPAGE
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
      limits[i] = calculateTokenLimit(tokenIn, slippagePercentage).toString();
    } else if (tokenOut) {
      limits[i] = calculateTokenLimit(tokenOut, slippagePercentage).toString();
    } else {
      limits[i] = '0';
    }
  });

  return limits;
}

function calculateTokenLimit(
  token: SwapToken,
  slippagePercentage: number
): BigNumberish {
  if (token.type === SwapTokenType.min) {
    return BigNumber.from(token.amount)
      .mul(parseFixed('1', 18))
      .div(parseFixed(String(1 + slippagePercentage), 18));
  }

  if (token.type === SwapTokenType.max) {
    return BigNumber.from(token.amount)
      .mul(parseFixed(String(1 + slippagePercentage), 18))
      .div(parseFixed('1', 18));
  }

  return token.amount;
}

export function convertSwapInfoToBatchSwap(
  swapType: SwapType,
  swapInfo: SwapInfo,
  senderAddress: Address,
  recipientAddress: Address,
  slippagePercentage?: number
): BatchSwap {
  const tokenIn: SwapToken = {
    address: swapInfo.tokenIn,
    amount: BigNumber.from(swapInfo.swapAmount),
    type:
      swapType === SwapType.SwapExactIn
        ? SwapTokenType.fixed
        : SwapTokenType.max,
  };
  const tokenOut: SwapToken = {
    address: swapInfo.tokenOut,
    amount: BigNumber.from(swapInfo.returnAmount),
    type:
      swapType === SwapType.SwapExactOut
        ? SwapTokenType.fixed
        : SwapTokenType.min,
  };
  const limits = calculateLimits(
    [tokenIn],
    [tokenOut],
    swapInfo.tokenAddresses,
    slippagePercentage
  );

  const batchSwapData: BatchSwap = {
    kind: swapType,
    swaps: swapInfo.swaps,
    assets: swapInfo.tokenAddresses,
    funds: {
      fromInternalBalance: false,
      sender: senderAddress,
      recipient: recipientAddress,
      toInternalBalance: false,
    },
    limits: limits,
    deadline: calculateDeadlineExpiry(SOR_DEADLINE),
  };

  return batchSwapData;
}
