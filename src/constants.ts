import { Schema } from "types";

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

/** 
 * Used for marshalling / unmarshalling into DynamoDB
 * 
 * Number: Saved as a number in DynamoDB and JS
 * BigNumber: Saved as a number in DynamoDB, but a String in JS
*/
export const POOL_SCHEMA: Schema = {
    swapEnabled: { type: 'Boolean' },
    swapFee: { type: 'BigNumber' },

    totalWeight: { type: 'BigNumber' },
    totalSwapVolume: { type: 'BigNumber' },
    totalSwapFee: { type: 'BigNumber' },
    totalLiquidity: { type: 'BigNumber' },
    totalShares: { type: 'BigNumber' },

    createTime: { type: 'Number' },
    swapsCount: { type: 'BigNumber' },
    holdersCount: { type: 'BigNumber' },

    // StablePool Only
    amp: { type: 'BigNumber' },

    // ConvergentCurvePool (Element) Only
    expiryTime: { type: 'Number' },
    unitSeconds: { type: 'Number' },

    //InvestmentPool Only
    managementFee: { type: 'BigNumber' },

    // LinearPool only
    mainIndex: { type: 'Number' },
    wrappedIndex: { type: 'Number' },
    lowerTarget: { type: 'BigNumber' },
    upperTarget: { type: 'BigNumber' },
}