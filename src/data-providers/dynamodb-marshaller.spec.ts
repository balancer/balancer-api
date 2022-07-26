import { Pool } from '../types';
import { marshallPool, unmarshallPool } from './dynamodb-marshaller';
import POOLS from '../../test/mocks/pools';

describe('DynamoDB Marshaller', () => {
  describe('Marshall Pool', () => {
    it('Should convert a pool to a DynamoDB object', () => {
      const poolData = {
        "address": "0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73",
        "lastUpdate": 1658367402200,
        "totalLiquidity": "1558.43063451471",
        "totalShares": "1912943815"
      };
      const marshalledPool: any = marshallPool(poolData as Pool);
      expect(marshalledPool.address).toMatchObject({'S': poolData.address});
      expect(marshalledPool.lastUpdate).toMatchObject({'N': poolData.lastUpdate.toString()});
      expect(marshalledPool.totalLiquidity).toMatchObject({'N': poolData.totalLiquidity});
      expect(marshalledPool.totalShares).toMatchObject({'N': poolData.totalShares});
    });

    it('Should round numbers to 38 digits of precision', () => {
      const poolData = {
        "totalLiquidity": "12345678901234567890.123456789012345678901234567890"
      }
      const marshalledPool: any = marshallPool(poolData as Pool);
      expect(marshalledPool.totalLiquidity).toMatchObject({'N': '12345678901234567890.123456789012345679'})
    });

    it('Should not crash if one of the schema items is undefined', () => {
      const poolData = {
        totalShares: '58',
        totalLiquidity: undefined
      };

      const marshalledPool: any = marshallPool(poolData as any);
      expect(marshalledPool.totalShares).toMatchObject({'N': '58'});
      expect(marshalledPool.totalLiquidity).toBeUndefined();
    });

    it('Should not crash if one of the schema items is null', () => {
      const poolData = {
        totalSwapFee: '32.9114',
        holdersCount: null,
      };
      const marshalledPool: any = marshallPool(poolData as any);
      expect(marshalledPool.totalSwapFee).toMatchObject({'N': '32.9114'});
      expect(marshalledPool.holdersCount).toMatchObject({'NULL': true});
    });
  });

  describe('Unmarshall Pool', () => {
    it('Should convert an pool from the database back into a normal pool', () => {
      const dbPool = {
        totalSwapFee: {
          'N': '41.889'
        },
        chainId: {
          'N': '1'
        },
        address: {
          'S': "0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73"
        }
      }
      const expectedPool = {
        totalSwapFee: '41.889',
        chainId: 1,
        address: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73'
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
  })
})