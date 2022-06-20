import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sdk';

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

// price is the price of the native asset (ETH, MATIC, etc) 
// with the token as the base 
// e.g. with ETH at $20000, WBTC at $50000 
// USDC would be 20000, WBTC would be 0.4
export interface Token {
    address: string;
    chainId: number;
    decimals: number;
    symbol: string;
    price: string; 
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
  totalLiquidity: string;
}


export interface SorRequest {
    sellToken: string;
    buyToken: string;
    orderKind: 'sell' | 'buy',
    amount: string;
    gasPrice: string;
}