
export interface SorRequest {
  sellToken: string;
  buyToken: string;
  orderKind: 'sell' | 'buy';
  amount: string;
  gasPrice: string;
}

export interface SerializedSwapInfo {
  tokenAddresses: string[];
  swaps: SwapV2[];
  swapAmount: string;
  swapAmountForSwaps?: string;
  returnAmount: string;
  returnAmountFromSwaps?: string;
  returnAmountConsideringFees: string;
  tokenIn: string;
  tokenOut: string;
  marketSp: string;
}