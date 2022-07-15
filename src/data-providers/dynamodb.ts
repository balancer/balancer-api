/* Functions for writing and reading to DynamoDB database */
import AWS from 'aws-sdk';
import { POOLS_TABLE_SCHEMA, TOKENS_TABLE_SCHEMA } from '../constants';
import { Token, Pool } from '../types';

const log = console.log;

const dynamodb = new AWS.DynamoDB({maxRetries: 50, retryDelayOptions: {customBackoff: () => 1000} });

export async function isAlive() {
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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

export async function getPools(chainId?: number, lastResult?: any): Promise<Pool[]> {
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
  const params: AWS.DynamoDB.DocumentClient.ScanInput = {
    TableName: 'pools',
    ExclusiveStartKey: lastResult ? lastResult.LastEvaluatedKey : undefined
  }
  if (chainId) {
    params.FilterExpression = 'chainId = :chainId'
    params.ExpressionAttributeValues = {
        ':chainId': chainId
    }
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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
  const docClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});
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
  await createTable(POOLS_TABLE_SCHEMA);
}

export async function updatePoolsTable() {
  const schema = POOLS_TABLE_SCHEMA;
  delete schema.KeySchema;
  await updateTable(schema);
}

export async function createTokensTable() {
  await createTable(TOKENS_TABLE_SCHEMA);
}

export async function updateTokensTable() {
  await updateTable(TOKENS_TABLE_SCHEMA);
}

export async function updateTable(params) {
  console.log("Updating table with params: ", params);
  try {
    await dynamodb.updateTable(params).promise();
  } catch (err) {
    console.error("Unable to update table. Error JSON:", JSON.stringify(err, null, 2));
  }
  console.log("Updated table ", params.TableName);
}

export async function createTable(params) {
  console.log("Creating table with params: ", params);
  try {
    await dynamodb.createTable(params).promise();
  } catch (err) {
    console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
  }
  console.log("Created table ", params.TableName);
}

export async function deleteTable(name) {
  try {
    await dynamodb.deleteTable({TableName: name}).promise();
  } catch(err) {
    console.error("Unable to delete table ", name, " error: ", err);
  }
  console.log("Deleted table ", name);
}