import { DynamoDB } from 'aws-sdk';
import { Schema } from '../types';

export const POOLS_TABLE_SCHEMA: DynamoDB.Types.CreateTableInput = {
  TableName: 'pools',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' },
    { AttributeName: 'chainId', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'chainId', AttributeType: 'N' },
    { AttributeName: 'totalLiquidity', AttributeType: 'N' },
    { AttributeName: 'volumeSnapshot', AttributeType: 'N' },
    { AttributeName: 'maxApr', AttributeType: 'N' },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  GlobalSecondaryIndexes: [
    {
      IndexName: 'byTotalLiquidity',
      KeySchema: [
        { AttributeName: 'chainId', KeyType: 'HASH' },
        { AttributeName: 'totalLiquidity', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'byVolume',
      KeySchema: [
        { AttributeName: 'chainId', KeyType: 'HASH' },
        { AttributeName: 'volumeSnapshot', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'byApr',
      KeySchema: [
        { AttributeName: 'chainId', KeyType: 'HASH' },
        { AttributeName: 'maxApr', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
};

export const TOKENS_TABLE_SCHEMA = {
  TableName: 'tokens',
  KeySchema: [
    { AttributeName: 'address', KeyType: 'HASH' },
    { AttributeName: 'chainId', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'address', AttributeType: 'S' },
    { AttributeName: 'chainId', AttributeType: 'N' },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

/**
 * Used for marshalling / unmarshalling into DynamoDB
 *
 * Number: Saved as a number in DynamoDB and JS
 * BigNumber: Saved as a number in DynamoDB, but a String in JS
 */
export const POOL_SCHEMA: Schema = {
  id: { type: 'String', static: true },
  chainId: { type: 'Int', static: true },
  poolType: { type: 'String', static: true },
  poolTypeVersion: { type: 'Int', static: true },

  name: { type: 'String', static: false },
  address: { type: 'String', static: true },
  owner: { type: 'String', static: false },
  factory: { type: 'String', static: true },
  symbol: { type: 'String', static: true },

  isNew: { type: 'Boolean', static: false },

  tokens: { type: 'Array', static: false },
  tokensList: { type: 'Array', static: false },

  swapEnabled: { type: 'Boolean', static: false },
  swapFee: { type: 'BigDecimal', static: false },

  protocolYieldFeeCache: { type: 'String', static: false },
  protocolSwapFeeCache: { type: 'String', static: false },

  totalWeight: { type: 'BigDecimal', static: true },
  totalSwapVolume: { type: 'BigDecimal', static: false },
  totalSwapFee: { type: 'BigDecimal', static: false },
  totalLiquidity: { type: 'BigDecimal', static: false },
  totalShares: { type: 'BigDecimal', static: false },

  volumeSnapshot: { type: 'BigDecimal', static: false },
  feesSnapshot: { type: 'BigDecimal', static: false },
  maxApr: { type: 'BigDecimal', static: false },

  createTime: { type: 'Int', static: true },
  swapsCount: { type: 'BigInt', static: false },
  holdersCount: { type: 'BigInt', static: false },

  // StablePool Only
  amp: { type: 'BigInt', static: false },

  //InvestmentPool Only
  managementFee: { type: 'BigDecimal', static: false },

  // LinearPool only
  mainIndex: { type: 'Int', static: true },
  wrappedIndex: { type: 'Int', static: true },
  lowerTarget: { type: 'BigDecimal', static: true },
  upperTarget: { type: 'BigDecimal', static: true },
};

/**
 * Used for marshalling / unmarshalling Pool Tokens for
 * DynamoDB. Also used for removing static items to save
 * update bandwidth.
 */
export const POOL_TOKEN_SCHEMA: Schema = {
  name: { type: 'String', static: true },
  symbol: { type: 'String', static: true },
  address: { type: 'String', static: true },
  decimals: { type: 'Int', static: true },
  isExemptFromYieldProtocolFee: { type: 'Boolean', static: false },
  weight: { type: 'BigDecimal', static: false },
  price: { type: 'Object', static: false },
  priceRate: { type: 'BigDecimal', static: false },
  balance: { type: 'BigDecimal', static: false },
  token: { type: 'Object', static: false },
};
