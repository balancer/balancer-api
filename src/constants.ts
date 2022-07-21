export const COINGECKO_BASEURL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_MAX_TOKENS_PER_PAGE = 100;
export const COINGECKO_MAX_TPS = 10;

export const MAX_BATCH_WRITE_SIZE = 25;
export const MAX_DYNAMODB_PRECISION = 38;


export const POOLS_TABLE_SCHEMA = {
  TableName : "pools",
  KeySchema: [       
      { AttributeName: "id", KeyType: "HASH"},
      { AttributeName: "chainId", KeyType: "RANGE"},
  ],
  AttributeDefinitions: [       
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "chainId", AttributeType: "N" },
  ],
  ProvisionedThroughput: {       
      ReadCapacityUnits: 10, 
      WriteCapacityUnits: 10
  }
}

export const TOKENS_TABLE_SCHEMA = {
  TableName : "tokens",
  KeySchema: [       
      { AttributeName: "address", KeyType: "HASH"},
      { AttributeName: "chainId", KeyType: "RANGE"},
  ],
  AttributeDefinitions: [       
      { AttributeName: "address", AttributeType: "S" },
      { AttributeName: "chainId", AttributeType: "N" },
  ],
  ProvisionedThroughput: {       
      ReadCapacityUnits: 10, 
      WriteCapacityUnits: 10
  }
}

export const POOL_SCHEMA = {
    swapEnabled: { type: 'Boolean' },
    swapFee: { type: 'Number' },

    totalWeight: { type: 'Number' },
    totalSwapVolume: { type: 'Number' },
    totalSwapFee: { type: 'Number' },
    totalLiquidity: { type: 'Number' },
    totalShares: { type: 'Number' },

    createTime: { type: 'Number' },
    swapsCount: { type: 'Number' },
    holdersCount: { type: 'Number' },

    // StablePool Only
    amp: { type: 'Number' },

    // ConvergentCurvePool (Element) Only
    expiryTime: { type: 'Number' },
    unitSeconds: { type: 'Number' },

    //InvestmentPool Only
    managementFee: { type: 'Number' },

    // LinearPool only
    mainIndex: { type: 'Number' },
    wrappedIndex: { type: 'Number' },
    lowerTarget: { type: 'Number' },
    upperTarget: { type: 'Number' },
}