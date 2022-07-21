import { Pool } from '../types';
import { marshallPool } from './dynamodb-marshaller';

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
    })
  });
})