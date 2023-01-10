import { AprBreakdown, Price } from '@balancer-labs/sdk';
import {
  formatPrice,
  getNonStaticSchemaFields,
  isSame,
  isValidApr,
} from './utils';
import { Pool, Schema } from './types';
import _ from 'lodash';

import POOLS from '../test/mocks/pools';

jest.unmock('@balancer-labs/sdk');

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

  describe('formatPrice', () => {
    it('Should return the same price for all currencies', () => {
      const price: Price = {
        usd: '5.87',
        eth: '0.002',
      };

      const formattedPrice = formatPrice(price);
      expect(formattedPrice).toEqual(price);
    });

    it('Should return scientific notation numbers in decimal format', () => {
      const price: Price = {
        usd: '3e-25',
        eth: '9.8332e-11',
      };

      const expectedPrice: Price = {
        usd: '0.0000000000000000000000003',
        eth: '0.000000000098332',
      };

      const formattedPrice = formatPrice(price);
      expect(formattedPrice).toEqual(expectedPrice);
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

    it('Should return false if oldPool has slightly different tokens', () => {
      oldPool = _.cloneDeep(POOLS[0]);
      if (oldPool && oldPool.tokens) {
        oldPool.tokens[0].balance = '12345';
      }
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
