export const COINGECKO_BASEURL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_MAX_TOKENS_PER_PAGE = 100;
export const COINGECKO_MAX_TPS = 10;


export const POOLS_TABLE_SCHEMA = {
  TableName : "pools",
  KeySchema: [       
      { AttributeName: "id", KeyType: "HASH"},
      { AttributeName: "chainId", KeyType: "RANGE"},
  ],
  AttributeDefinitions: [       
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "chainId", AttributeType: "N" },
      { AttributeName: "totalLiquidity", AttributeType: "N" },
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