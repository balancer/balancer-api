export const COINGECKO_BASEURL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_MAX_TOKENS_PER_PAGE = 100;
export const COINGECKO_MAX_TPS = 10;

export const MAX_BATCH_WRITE_SIZE = 25;
export const MAX_DYNAMODB_PRECISION = 38;

export const Network: Record<string, number> = {
  MAINNET: 1,
  GOERLI: 5,
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

export const TEST_NETWORKS: Record<string, number> = Object.entries(Network)
  .filter(([, id]) => {
    return [Network.GOERLI, Network.KOVAN].includes(id)
  })
  .reduce((obj: Record<string, number>, [name, id]) => {
    obj[name] = id
    return obj;
  }, {});


export const PRODUCTION_NETWORKS: Record<string, number> = Object.entries(Network)
  .filter(([name]) => {
    return TEST_NETWORKS[name] == null
  })
  .reduce((obj: Record<string, number>, [name, id]) => {
    obj[name] = id
    return obj;
  }, {});
