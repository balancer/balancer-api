import { Address, SwapV2 } from '@sobal/sdk';
import { BigNumberish } from 'ethers';

export interface SorRequest {
  sellToken: Address;
  buyToken: Address;
  orderKind: 'sell' | 'buy';
  amount: BigNumberish;
  gasPrice: string;

  // Used for Sor Orders
  sender?: Address;
  recipient?: Address;
  // Maximum allowable slippage in decimal format, 0.01 = 1%
  slippagePercentage?: number;
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

// Price information to be sent with a SOR order response
export interface PriceResponse {
  // Amount of the sell token to sell
  sellAmount: BigNumberish;
  // Amount of the buy token the person will receive
  buyAmount: BigNumberish;
  // Address to give spend allowance to if the user hasn't already
  allowanceTarget: Address;
  // The market spot price the user is trading at in this order
  price: string;
}

export interface SorOrderResponse {
  // Price information from SOR
  price: PriceResponse;
  // The address the transaction should be sent to
  to: Address;
  // Transaction data
  data: string;
  // value to send with transaction
  value: BigNumberish;
}

export class SorError extends Error {}
