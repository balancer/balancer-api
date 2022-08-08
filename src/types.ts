import { Pool as SDKPool, SwapV2, Token as SDKToken } from '@balancer-labs/sdk';

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

export const NativeAssetId = {
    ETH: "ethereum",
    MATIC: "matic-network"
}

export const NativeAssetPriceSymbol = {
    ETH: "eth",
    MATIC: "matic"
}

export interface Order {
    sellToken: string;
    buyToken: string;
    orderKind: string;
    amount: string;
    gasPrice: string;
}

export interface Token extends SDKToken {
    chainId: number;
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

export interface Pool extends SDKPool {
  chainId: number;
  swapEnabled?: boolean;
  graphData?: {
    totalLiquidity?: string;
  }
  lastUpdate?: number;
}


export interface SorRequest {
    sellToken: string;
    buyToken: string;
    orderKind: 'sell' | 'buy',
    amount: string;
    gasPrice: string;
}

export interface Schema {
    [key: string]: {
        type: 'BigDecimal' | 'BigInt' | 'Boolean' | 'Int' | 'String'
    }
}