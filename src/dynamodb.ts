/* Functions for writing and reading to DynamoDB database */

const AWS = require("aws-sdk");

const log = console.log;
const docClient = new AWS.DynamoDB.DocumentClient();

export async function updatePools(pools) {
  return Promise.all(pools.map(function(pool) {
    var params = {
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

export async function getPools() {
  try {
    const pools = await docClient.scan({TableName: 'pools'}).promise()
    return pools.Items;
  } catch (e) {
      console.error("Failed to get pools, error is: ", e)
      return [];
  }
}

export async function getPool(id: string) {
  const params = {
    TableName: 'pools',
    Key: {
      'id': id
    }
  };

  try {
    const pool = await docClient.get(params).promise();
    return pool.Item;
  } catch (e) {
    console.error("Failed to get pool of id: ", id);
  }
}

export async function getToken(address: string) {
  const params = {
    TableName: "tokens",
    Key: { address }
  }

  try {
    const token = await docClient.get(params).promise();
    return token.Item;
  } catch (e) {
    console.error("Failed to get token of address ", address);
  }
}

export async function insertToken(tokenInfo) {
  const params = {
    TableName: "tokens",
    Item: tokenInfo
  }

  try {
    await docClient.put(params).promise()
  } catch (e) {
    console.error("Failed to inser token, error is: ", e);
  }
}

export async function createPoolsTable() {
  const params = {
    TableName : "pools",
    KeySchema: [       
        { AttributeName: "id", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [       
        { AttributeName: "id", AttributeType: "S" },
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
        { AttributeName: "address", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [       
        { AttributeName: "address", AttributeType: "S" },
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
  }
  
  await createTable(params)
}

export async function createTable(params) {
  var dynamodb = new AWS.DynamoDB();
  await dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
  });
}
