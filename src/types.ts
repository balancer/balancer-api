import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

export const Network = {
    MAINNET: 1,
    KOVAN: 42,
    POLYGON: 137,
    ARBITRUM: 42161
}

export const NativeAssetAddress = {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    MATIC: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0"
}

export interface Order {
    sellToken: string;
    buyToken: string;
    orderKind: string;
    amount: string;
    gasPrice: string;
}

export interface Token {
    address: string;
    chainId: number;
    decimals: number;
    symbol: string;
    price: string; // Price of the token in the native asset (ETH, MATIC, etc)
    lastUpdate?: number;
    noPriceData?: boolean;
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

export interface Pool extends SubgraphPoolBase {
  chainId: number;
}
