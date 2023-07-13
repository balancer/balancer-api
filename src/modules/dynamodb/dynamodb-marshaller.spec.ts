import { Pool } from '@/modules/pools';
import { UpdateExpression } from './types';
import {
  generateUpdateExpression,
  marshallPool,
  unmarshallPool,
} from './dynamodb-marshaller';
import POOLS from '@tests/mocks/pools';

jest.unmock('@sobal/sdk');

describe('DynamoDB Marshaller', () => {
  describe('Marshall Pool', () => {
    it('Should convert a pool to a DynamoDB object', () => {
      const poolData = {
        address: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73',
        lastUpdate: 1658367402200,
        totalLiquidity: '1558.43063451471',
        totalShares: '1912943815',
      };
      const marshalledPool: any = marshallPool(poolData as Pool);
      expect(marshalledPool.address).toMatchObject({ S: poolData.address });
      expect(marshalledPool.lastUpdate).toMatchObject({
        N: poolData.lastUpdate.toString(),
      });
      expect(marshalledPool.totalLiquidity).toMatchObject({
        N: poolData.totalLiquidity,
      });
      expect(marshalledPool.totalShares).toMatchObject({
        N: poolData.totalShares,
      });
    });

    it('Should round numbers to 38 digits of precision', () => {
      const poolData = {
        totalLiquidity: '12345678901234567890.123456789012345678901234567890',
      };
      const marshalledPool: any = marshallPool(poolData as Pool);
      expect(marshalledPool.totalLiquidity).toMatchObject({
        N: '12345678901234567890.123456789012345679',
      });
    });

    it('Should not crash if one of the schema items is undefined', () => {
      const poolData = {
        totalShares: '58',
        totalLiquidity: undefined,
      };

      const marshalledPool: any = marshallPool(poolData as any);
      expect(marshalledPool.totalShares).toMatchObject({ N: '58' });
      expect(marshalledPool.totalLiquidity).toBeUndefined();
    });

    it('Should not crash if one of the schema items is null', () => {
      const poolData = {
        totalSwapFee: '32.9114',
        holdersCount: null,
      };
      const marshalledPool: any = marshallPool(poolData as any);
      expect(marshalledPool.totalSwapFee).toMatchObject({ N: '32.9114' });
      expect(marshalledPool.holdersCount).toMatchObject({ NULL: true });
    });

    it('Should correctly parse schema number values that are 0', () => {
      const poolData = {
        totalLiquidity: '0',
        totalShares: '0',
        swapFee: '0.000001',
      };
      const marshalledPool: any = marshallPool(poolData as any);
      expect(marshalledPool).toMatchObject({
        totalLiquidity: { N: '0' },
        totalShares: { N: '0' },
        swapFee: { N: '0.000001' },
      });
    });
  });

  describe('Unmarshall Pool', () => {
    it('Should convert a pool from the database back into a normal pool', () => {
      const dbPool = {
        totalSwapFee: {
          N: '41.889',
        },
        chainId: {
          N: '1',
        },
        address: {
          S: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73',
        },
        tokensList: {
          L: [
            {
              S: '0xddd5032dc4bf638e15b4a66bc718ba7ba474ff73',
            },
            {
              S: '0xeee5032dc4bf638e15b4a66bc718ba7ba474ff73',
            },
          ],
        },
      };
      const expectedPool = {
        totalSwapFee: '41.889',
        chainId: 1,
        address: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73',
        tokensList: [
          '0xddd5032dc4bf638e15b4a66bc718ba7ba474ff73',
          '0xeee5032dc4bf638e15b4a66bc718ba7ba474ff73',
        ],
      };
      const unmarshalledPool = unmarshallPool(dbPool);
      expect(unmarshalledPool).toMatchObject(expectedPool);
    });

    it('Should be able to unmarshall deep objects', () => {
      const dbPool = {
        id: {
          S: '0x9c08c7a7a89cfd671c79eacdc6f07c1996277ed5000200000000000000000025',
        },
        totalShares: {
          N: '39522955.298207500034572608',
        },
        tokens: {
          L: [
            {
              M: {
                weight: { S: '0.5' },
                address: { S: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
                priceRate: { S: '1' },
                balance: { S: '4318.529528' },
                decimals: { N: '6' },
              },
            },
            {
              M: {
                weight: { S: '0.5' },
                address: { S: '0xba100000625a3754423978a60c9317c58a424e3d' },
                priceRate: { S: '1' },
                balance: { S: '250.958639102476791721' },
                decimals: { N: '18' },
              },
            },
          ],
        },
      };
      const expectedPool = {
        id: '0x9c08c7a7a89cfd671c79eacdc6f07c1996277ed5000200000000000000000025',
        totalShares: '39522955.298207500034572608',
        tokens: [
          {
            weight: '0.5',
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            priceRate: '1',
            balance: '4318.529528',
            decimals: 6,
          },
          {
            weight: '0.5',
            address: '0xba100000625a3754423978a60c9317c58a424e3d',
            priceRate: '1',
            balance: '250.958639102476791721',
            decimals: 18,
          },
        ],
      };
      const unmarshalledPool = unmarshallPool(dbPool);
      expect(unmarshalledPool).toMatchObject(expectedPool);
    });

    it('Should be able to marshall then unmarshall and have the same object at the end', () => {
      const originalPool = POOLS[0];
      const marshalledPool = marshallPool(originalPool);
      const unmarshalledPool = unmarshallPool(marshalledPool);
      expect(unmarshalledPool).toMatchObject(originalPool);
    });
  });

  describe('generateUpdateExpression', () => {
    const pool = {
      id: '0x9c08c7a7a89cfd671c79eacdc6f07c1996277ed5000200000000000000000025',
      totalShares: '39522955.298207500034572608',
      swapEnabled: true,
      poolType: 'Weighted',
      address: '0x9c08c7a7a89cfd671c79eacdc6f07c1996277ed5',
      chainId: 1,
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          weight: '0.5',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          priceRate: '1',
          balance: '4318.529528',
          decimals: 6,
        },
        {
          symbol: 'BAL',
          name: 'Balancer',
          weight: '0.5',
          address: '0xba100000625a3754423978a60c9317c58a424e3d',
          priceRate: '1',
          balance: '250.958639102476791721',
          decimals: 18,
        },
      ],
    };

    it('Should generate a correct update expression', () => {
      const expectedUpdateExpression: UpdateExpression = {
        UpdateExpression:
          'SET #totalShares = :totalShares, #swapEnabled = :swapEnabled, #poolType = :poolType, #address = :address, #tokens = :tokens',
        ExpressionAttributeNames: {
          '#totalShares': 'totalShares',
          '#swapEnabled': 'swapEnabled',
          '#poolType': 'poolType',
          '#address': 'address',
          '#tokens': 'tokens',
        },
        ExpressionAttributeValues: {
          ':totalShares': {
            N: '39522955.298207500034572608',
          },
          ':swapEnabled': {
            BOOL: true,
          },
          ':poolType': {
            S: 'Weighted',
          },
          ':address': {
            S: '0x9c08c7a7a89cfd671c79eacdc6f07c1996277ed5',
          },
          ':tokens': {
            L: [
              {
                M: {
                  symbol: { S: 'USDC' },
                  name: { S: 'USD Coin' },
                  weight: { S: '0.5' },
                  address: { S: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
                  priceRate: { S: '1' },
                  balance: { S: '4318.529528' },
                  decimals: { N: '6' },
                },
              },
              {
                M: {
                  symbol: { S: 'BAL' },
                  name: { S: 'Balancer' },
                  weight: { S: '0.5' },
                  address: { S: '0xba100000625a3754423978a60c9317c58a424e3d' },
                  priceRate: { S: '1' },
                  balance: { S: '250.958639102476791721' },
                  decimals: { N: '18' },
                },
              },
            ],
          },
        },
      };

      const updateExpression = generateUpdateExpression(pool as Pool);
      expect(updateExpression).toEqual(expectedUpdateExpression);
    });

    it('Should ignore static fields if options.ignoreStaticData is set', () => {
      const expectedUpdateExpression: UpdateExpression = {
        UpdateExpression:
          'SET #totalShares = :totalShares, #swapEnabled = :swapEnabled, #tokens = :tokens',
        ExpressionAttributeNames: {
          '#totalShares': 'totalShares',
          '#swapEnabled': 'swapEnabled',
          '#tokens': 'tokens',
        },
        ExpressionAttributeValues: {
          ':totalShares': {
            N: '39522955.298207500034572608',
          },
          ':swapEnabled': {
            BOOL: true,
          },
          ':tokens': {
            L: [
              {
                M: {
                  symbol: { S: 'USDC' },
                  name: { S: 'USD Coin' },
                  weight: { S: '0.5' },
                  address: { S: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
                  priceRate: { S: '1' },
                  balance: { S: '4318.529528' },
                  decimals: { N: '6' },
                },
              },
              {
                M: {
                  symbol: { S: 'BAL' },
                  name: { S: 'Balancer' },
                  weight: { S: '0.5' },
                  address: { S: '0xba100000625a3754423978a60c9317c58a424e3d' },
                  priceRate: { S: '1' },
                  balance: { S: '250.958639102476791721' },
                  decimals: { N: '18' },
                },
              },
            ],
          },
        },
      };

      const updateExpression = generateUpdateExpression(pool as Pool, {
        ignoreStaticData: true,
      });
      expect(updateExpression).toEqual(expectedUpdateExpression);
    });
  });
});
