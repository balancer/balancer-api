import { AprBreakdown } from '@sobal/sdk';
import {
  getNonStaticSchemaFields,
  isSame,
  isSchemaFieldANumber,
  isValidApr,
} from './utils';
import { Pool } from './types';
import { POOL_SCHEMA, Schema } from '@/modules/dynamodb';
import _ from 'lodash';

import POOLS from '@tests/mocks/pools';

jest.unmock('@sobal/sdk');

describe('utils', () => {
  describe('isValidApr', () => {
    it('Should return false if the APR contains NaN', () => {
      const invalidApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {},
        },
        stakingApr: {
          min: 0,
          max: 0,
        },
        rewardAprs: {
          total: NaN,
          breakdown: {},
        },
        protocolApr: 0,
        min: NaN,
        max: NaN,
      };

      expect(isValidApr(invalidApr)).toBe(false);
    });

    it('Should return false if the staking APR contains NaN', () => {
      const invalidStakingApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {},
        },
        stakingApr: {
          min: NaN,
          max: 0,
        },
        rewardAprs: {
          total: 0,
          breakdown: {},
        },
        protocolApr: 0,
        min: 0,
        max: 0,
      };

      expect(isValidApr(invalidStakingApr)).toBe(false);
    });

    it('Should return false if the swap fees APR is Infinity', () => {
      const invalidStakingApr: AprBreakdown = {
        swapFees: Infinity,
        tokenAprs: {
          total: 0,
          breakdown: {},
        },
        stakingApr: {
          min: 0,
          max: 0,
        },
        rewardAprs: {
          total: 0,
          breakdown: {},
        },
        protocolApr: 0,
        min: 0,
        max: 0,
      };

      expect(isValidApr(invalidStakingApr)).toBe(false);
    });

    it('Should return true if the APR is the default empty APR', () => {
      const defaultApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {},
        },
        stakingApr: {
          min: 0,
          max: 0,
        },
        rewardAprs: {
          total: 0,
          breakdown: {},
        },
        protocolApr: 0,
        min: 0,
        max: 0,
      };

      expect(isValidApr(defaultApr)).toBe(true);
    });

    it('Should return true for APRs filled with numbers', () => {
      const calculatedApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {},
        },
        stakingApr: {
          min: 123,
          max: 456,
        },
        rewardAprs: {
          total: 0,
          breakdown: {},
        },
        protocolApr: 88,
        min: 145,
        max: 556,
      };

      expect(isValidApr(calculatedApr)).toBe(true);
    });
  });

  describe('isSchemaFieldANumber', () => {
    it('Should return true for number fields', () => {
      const schema: Schema = POOL_SCHEMA;
      expect(isSchemaFieldANumber('volumeSnapshot', schema)).toBeTruthy();
      expect(isSchemaFieldANumber('createTime', schema)).toBeTruthy();
      expect(isSchemaFieldANumber('amp', schema)).toBeTruthy();
    });

    it('Should return false for non number fields', () => {
      const schema: Schema = POOL_SCHEMA;
      expect(isSchemaFieldANumber('name', schema)).toBeFalsy();
      expect(isSchemaFieldANumber('isNew', schema)).toBeFalsy();
      expect(isSchemaFieldANumber('tokens', schema)).toBeFalsy();
    });
  });

  describe('isSame', () => {
    let newPool: Pool;
    let oldPool: Pool | undefined;

    beforeEach(() => {
      newPool = POOLS[0];
    });

    it('Should return false if oldPool is undefined', () => {
      const same = isSame(newPool);
      expect(same).toBe(false);
    });

    it('Should return true if oldPool is the same', () => {
      oldPool = Object.assign({}, POOLS[0]);
      const same = isSame(newPool, oldPool);
      expect(same).toBe(true);
    });

    it('Should return true if the only difference is the formatting of amp', () => {
      oldPool = Object.assign({}, POOLS[0]);
      oldPool.amp = '200';
      newPool.amp = '200.0';
      const same = isSame(newPool, oldPool);
      expect(same).toBe(true);
    });

    it('Should return false if oldPool has slightly different tokens', () => {
      oldPool = _.cloneDeep(POOLS[0]);
      if (oldPool && oldPool.tokens) {
        oldPool.tokens[0].balance = '12345';
      }
      const same = isSame(newPool, oldPool);
      expect(same).toBe(false);
    });

    it('Should return true if two large numbers are the same', () => {
      oldPool = Object.assign({}, POOLS[0]);
      oldPool.volumeSnapshot = '123456789123456789123456789123456789.12345';
      newPool.volumeSnapshot = '123456789123456789123456789123456789.12345';
      const same = isSame(newPool, oldPool);
      expect(same).toBe(true);
    });

    it('Should return false if two large numbers are different', () => {
      oldPool = Object.assign({}, POOLS[0]);
      oldPool.volumeSnapshot = '123456789123456789123456789123456789.12345';
      newPool.volumeSnapshot = '123456789123456789123456789123467899.12345';
      const same = isSame(newPool, oldPool);
      expect(same).toBe(false);
    });
  });

  describe('getNonStaticSchemaFields', () => {
    it('Should return a list of all schema fields that are not static', () => {
      const SCHEMA: Schema = {
        id: { type: 'String', static: true },
        totalSwapVolume: { type: 'BigDecimal', static: false },
        createTime: { type: 'Int', static: true },
        swapsCount: { type: 'BigInt', static: false },
      };

      const nonStaticFields = getNonStaticSchemaFields(SCHEMA);
      const expectedFields = ['totalSwapVolume', 'swapsCount'];
      expect(nonStaticFields).toEqual(expectedFields);
    });
  });
});
