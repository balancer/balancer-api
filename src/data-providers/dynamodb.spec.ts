import AWS from 'aws-sdk';
import { Pool } from '../types';
import POOLS from '../../test/mocks/pools';
import { updatePools } from './dynamodb';
import { marshallPool } from './dynamodb-marshaller';


jest.mock('aws-sdk', () => {
  const mDynamoDB = { 
    transactWriteItems: jest.fn(() => { 
      return { promise: () => Promise.resolve() }
    }),
    batchWriteItem: jest.fn(() => { 
      return { promise: () => Promise.resolve() }
    }),
  };
  return { DynamoDB: jest.fn(() => mDynamoDB) };
});

const mDynamoDB = new AWS.DynamoDB();

describe('DynamoDB', () => {
  describe('updatePools', () => {
    it('Should perform a transactWriteItem for each pool', async () => {
      const pools: Pool[] = POOLS.slice(0, 2);

      const expectedRequest = {
        TransactItems: [{
          Update: {
            Key: marshallPool(pools[0]),
            TableName: 'pools'
          }
        }, {
          Update: {
            Key: marshallPool(pools[1]),
            TableName: 'pools'
          }
        }]
      }

      await updatePools(pools);
      expect(mDynamoDB.transactWriteItems).toBeCalledWith(expectedRequest, expect.anything());
    });

    it('Should break pool updates into chunks of 25', () => {
      const pools: Pool[] = POOLS.slice(0).concat(POOLS.slice(0)).concat(POOLS.slice(0));
      expect(pools.length).toBe(30); // sanity check
    });

  });
})