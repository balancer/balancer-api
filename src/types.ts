export const Network = {
    MAINNET: 1,
    KOVAN: 42,
    POLYGON: 137,
    ARBITRUM: 42161
}

export interface Order {
    sellToken: string;
    buyToken: string;
    orderKind: string;
    amount: string;
    gasPrice: string;
}