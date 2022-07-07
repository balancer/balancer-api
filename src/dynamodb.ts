/* Functions for writing and reading to DynamoDB database */
import AWS from 'aws-sdk';
import { Token, Pool } from './types';

const log = console.log;

export async function isAlive() {
  const dynamodb = new AWS.DynamoDB();
  try {
    await Promise.race([
      dynamodb.listTables().promise(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ])
  } catch (e) {
    return false;
  }
  return true;
}

export async function updatePools(pools: Pool[]) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  return Promise.all(pools.map(function(pool) {
    const params = {
        TableName: "pools",
        Item: pool
    };

    return docClient.put(params, (err) => {
      if (err) {
        log(`Unable to add pool ${pool.id}. Error JSON: ${JSON.stringify(err, null, 2)}`);
      }
    }).promise();
  }));
}

export async function getPools(chainId: number, lastResult?: any): Promise<Pool[]> {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: 'pools',
    FilterExpression: 'chainId = :chainId',
    ExpressionAttributeValues: {
        ':chainId': chainId
    },
    ExclusiveStartKey: lastResult ? lastResult.LastEvaluatedKey : undefined
  }
  try {
    const pools = await docClient.scan(params).promise()
    if (lastResult) {
      pools.Items = lastResult.Items.concat(pools.Items);
    }
    if (pools.LastEvaluatedKey) {
      return await getPools(chainId, pools);
    }
    return pools.Items as Pool[];
  } catch (e) {
      console.error("Failed to get pools, error is: ", e)
      return [];
  }
}

export async function getPool(chainId: number, id: string) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: 'pools',
    Key: { id, chainId }
  };

  try {
    const pool = await docClient.get(params).promise();
    return pool.Item;
  } catch (e) {
    console.error(`Failed to get pool: ${chainId}, ${id}. Error is:`, e);
  }
}

export async function getToken(chainId: number, address: string): Promise<Token> {
  const docClient = new AWS.DynamoDB.DocumentClient();
  address = address.toLowerCase();
  const params = {
    TableName: "tokens",
    Key: { chainId, address }
  }

  try {
    const token = await docClient.get(params).promise();
    return token.Item as Token;
  } catch (e) {
    console.error(`Failed to get token: ${chainId}, ${address}. Error is:`, e);
  }
}

export async function getTokens(chainId?: number, lastResult?: any): Promise<Token[]> {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params: any = {
    TableName: 'tokens',
    ExclusiveStartKey: lastResult ? lastResult.LastEvaluatedKey : undefined
  }
  if (chainId != null) {
    Object.assign(params, {
      FilterExpression: 'chainId = :chainId',
      ExpressionAttributeValues: {
          ':chainId': chainId
      },
    })
  }
  try {
    const tokens = await docClient.scan(params).promise();
    if (lastResult) {
      tokens.Items = lastResult.Items.concat(tokens.Items);
    }
    if (tokens.LastEvaluatedKey) {
      return await getTokens(chainId, tokens);
    }
    return tokens.Items as Token[];
  } catch (e) {
      console.error("Failed to get tokens, error is: ", e)
      return [];
  }
}

export async function updateToken(tokenInfo: Token) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  tokenInfo.address = tokenInfo.address.toLowerCase();
  tokenInfo.lastUpdate = Date.now();
  const params = {
    TableName: "tokens",
    Item: tokenInfo
  };

  log(`Saving token: ${JSON.stringify(tokenInfo)}`);

  try {
    await docClient.put(params).promise();
  } catch (err) {
    log(`Unable to add token. Error JSON: ${JSON.stringify(err, null, 2)}`);
  }
}

export async function updateTokens(tokens: Token[]) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  return Promise.all(tokens.map(function(token) {
    token.address = token.address.toLowerCase();
    token.lastUpdate = Date.now();
    const params = {
        TableName: "tokens",
        Item: token
    };

    return docClient.put(params, (err) => {
      if (err) {
        log(`Unable to add token ${token.address}. Error JSON: ${JSON.stringify(err, null, 2)}`);
      }
    }).promise();
  }));
}

export async function createPoolsTable() {
  const params = {
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
        ReadCapacityUnits: 100, 
        WriteCapacityUnits: 100
    }
  };

  await createTable(params);
}

export async function createTokensTable() {
  const params = {
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
        ReadCapacityUnits: 100, 
        WriteCapacityUnits: 100
    }
  }
  
  await createTable(params)
}

export async function createTable(params) {
  const dynamodb = new AWS.DynamoDB();
  console.log("Creating table with params: ", params);
  try {
    await dynamodb.createTable(params).promise();
  } catch (err) {
    console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
  }
  console.log("Created table.");
}

export async function deleteTable(name) {
  const dynamodb = new AWS.DynamoDB();
  try {
    await dynamodb.deleteTable({TableName: name}).promise();
  } catch(err) {
    console.error("Unable to delete table ", name, " error: ", err);
  }
  console.log("Deleted table ", name);
}