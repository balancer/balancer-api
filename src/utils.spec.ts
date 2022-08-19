import { AprBreakdown } from "@balancer-labs/sdk";
import { isValidApr } from './utils';


describe('utils', () => {
  describe('isValidApr', () => {
    it('Should return false if the APR contains NaN', () => {
      const invalidApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {}
        },
        stakingApr: {
          min: 0,
          max: 0,
        },
        rewardAprs: {
          total: NaN,
          breakdown: {}
        },
        protocolApr: 0,
        min: NaN,
        max: NaN,
      }

      expect(isValidApr(invalidApr)).toBe(false);
    });

    it('Should return false if the staking APR contains NaN', () => {
      const invalidStakingApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {}
        },
        stakingApr: {
          min: NaN,
          max: 0,
        },
        rewardAprs: {
          total: 0,
          breakdown: {}
        },
        protocolApr: 0,
        min: 0,
        max: 0,
      }

      expect(isValidApr(invalidStakingApr)).toBe(false);
    });

    it('Should return true if the APR is the default empty APR', () => {
      const defaultApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {}
        },
        stakingApr: {
          min: 0,
          max: 0,
        },
        rewardAprs: {
          total: 0,
          breakdown: {}
        },
        protocolApr: 0,
        min: 0,
        max: 0,
      }

      expect(isValidApr(defaultApr)).toBe(true);
    });

    it('Should return true for APRs filled with numbers', () => {
      const calculatedApr: AprBreakdown = {
        swapFees: 0,
        tokenAprs: {
          total: 0,
          breakdown: {}
        },
        stakingApr: {
          min: 123,
          max: 456,
        },
        rewardAprs: {
          total: 0,
          breakdown: {}
        },
        protocolApr: 88,
        min: 145,
        max: 556,
      }

      expect(isValidApr(calculatedApr)).toBe(true);
    });
  })
})