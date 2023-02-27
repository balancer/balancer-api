import { TOKENS, Network } from '@/constants';
import { SwapTokenType } from '../tokens';
import { calculateLimits } from './batch-swap';

describe('SOR BatchSwap', () => {
  describe('calculateLimits', () => {
    let mockLimitsRequest: Parameters<typeof calculateLimits>;
    beforeEach(() => {
      mockLimitsRequest = [
        [{ 
            address: TOKENS[Network.MAINNET].BAL.address,
            amount: 10000,
            type: SwapTokenType.fixed
        }],
        [{ 
            address: TOKENS[Network.MAINNET].WETH.address,
            amount: 100,
            type: SwapTokenType.min
        }],
        [
          TOKENS[Network.MAINNET].BAL.address,
          TOKENS[Network.MAINNET].WETH.address,
        ],
      ]
    });

    it('Should return an array of the limits passed in if slippagePercentage is 0', () => {
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0]);
      expect(limits[0]).toEqual(mockLimitsRequest[0][0].amount.toString());
      expect(limits[1]).toEqual(mockLimitsRequest[1][0].amount.toString());
    });

    it('Should work with additional tokens that are being traded through, their limits should be 0', () => {
      mockLimitsRequest[2].push(TOKENS[Network.MAINNET].USDC.address);
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0]);
      expect(limits.length).toEqual(3);
      expect(limits[2]).toEqual('0');
    })

    it('Should return the token in with slippage added when type is max', () => {
      mockLimitsRequest[0][0].type = SwapTokenType.max;
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0.01]);
      expect(limits[0]).toEqual('10100');
    });

    it('Should not multiply the token in amount when they are fixed', () => {
      mockLimitsRequest[0][0].type = SwapTokenType.fixed;
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0.01]);
      expect(limits[0]).toEqual('10000');
    });

    it('Should return the token out with slippage subtracted when type is min', () => {
      mockLimitsRequest[1][0].type = SwapTokenType.min;
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0.01]);
      expect(limits[1]).toEqual('99');
    });

    it('Should not multiply the token out amounts when they are fixed', () => {
      mockLimitsRequest[1][0].type = SwapTokenType.fixed;
      const limits = calculateLimits.apply(this, [...mockLimitsRequest, 0.01]);
      expect(limits[1]).toEqual('100');
    })
  })
})