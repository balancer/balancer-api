import { SubgraphPoolBase } from '@balancer-labs/sor';

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

export interface Pool extends SubgraphPoolBase {
  chainId: number;
}
