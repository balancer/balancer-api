import AWS from 'aws-sdk';
import { Pool } from '@/modules/pools';
import POOLS from '@tests/mocks/pools';
import { updatePools } from './dynamodb';
import { generateUpdateExpression } from './dynamodb-marshaller';

jest.unmock('@sobal/sdk');

jest.mock('aws-sdk', () => {
  const mDynamoDB = {
    transactWriteItems: jest.fn(() => {
      return { promise: () => Promise.resolve() };
    }),
    batchWriteItem: jest.fn(() => {
      return { promise: () => Promise.resolve() };
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
        TransactItems: [
          {
            Update: Object.assign(
              {
                Key: {
                  id: { S: pools[0].id },
                  chainId: { N: pools[0].chainId.toString() },
                },
                TableName: 'pools',
              },
              generateUpdateExpression(pools[0])
            ),
          },
          {
            Update: Object.assign(
              {
                Key: {
                  id: { S: pools[1].id },
                  chainId: { N: pools[1].chainId.toString() },
                },
                TableName: 'pools',
              },
              generateUpdateExpression(pools[1])
            ),
          },
        ],
      };

      await updatePools(pools);
      expect(mDynamoDB.transactWriteItems).toBeCalledWith(
        expectedRequest,
        expect.anything()
      );
    });

    it('Should break pool updates into chunks of 25', () => {
      const pools: Pool[] = POOLS.slice(0)
        .concat(POOLS.slice(0))
        .concat(POOLS.slice(0));
      expect(pools.length).toBe(30); // sanity check
    });
  });
});
