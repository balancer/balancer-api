import { getSorSwap, _setLogger } from './sor';
import { mockSwapCostCalculator } from '@balancer-labs/sdk';

jest.mock('@balancer-labs/sdk');
jest.mock('@ethersproject/providers');
jest.mock('@ethersproject/contracts');
jest.mock('./data-providers/dynamodb');

const chainId = 1;

// eslint-disable-next-line @typescript-eslint/no-empty-function
_setLogger(() => {});

describe('SOR', () => {
  describe('getSorSwap', () => {
    let order;

    beforeEach(() => {
      jest.clearAllMocks();

      order = {
        amount: '1000000',
        buyToken: '0xABC',
        sellToken: '0xDEF',
        orderKind: 'buy',
        gasPrice: '100000',
      };

      require('./data-providers/dynamodb')._setToken('0xABC', {
        address: '0xABC',
        symbol: 'BAL',
        price: {
          usd: '5',
          eth: '0.0025',
        },
      });

      require('./data-providers/dynamodb')._setToken('0xDEF', {
        address: '0xDEF',
        symbol: 'WETH',
        price: {
          usd: '2000',
          eth: '1',
        },
      });
    });

    it('Should call setNativeAssetPriceInToken with the price of the native asset in the token when the price is an object', async () => {
      await getSorSwap(chainId, order);
      expect(
        mockSwapCostCalculator.setNativeAssetPriceInToken
      ).toHaveBeenCalledWith('0xABC', '400');
    });

    it('Should call setNativeAssetPriceInToken with the price of the native asset in the token when the price is a string. For backwards compatability', async () => {
      require('./data-providers/dynamodb')._setToken('0xABC', {
        address: '0xABC',
        price: '444',
      });
      await getSorSwap(chainId, order);
      expect(
        mockSwapCostCalculator.setNativeAssetPriceInToken
      ).toHaveBeenCalledWith('0xABC', '444');
    });

    it('Should call setNativeAssetPriceInToken with the price of the native asset in the token when the price is a string. For backwards compatability', async () => {
      require('./data-providers/dynamodb')._setToken('0xABC', {
        address: '0xABC',
        price: 555,
      });
      await getSorSwap(chainId, order);
      expect(
        mockSwapCostCalculator.setNativeAssetPriceInToken
      ).toHaveBeenCalledWith('0xABC', '555');
    });

    it('Should call setNativeAssetPriceInToken with 0 if the token cannot be found', async () => {
      order.buyToken = '0xFFF';
      await getSorSwap(chainId, order);
      expect(
        mockSwapCostCalculator.setNativeAssetPriceInToken
      ).toHaveBeenCalledWith('0xFFF', '0');
    });

    it('Should call setNativeAssetPriceInToken with 0 if the token doesnt have a valid price', async () => {
      require('./data-providers/dynamodb')._setToken('0xABC', {
        address: '0xABC',
        price: undefined,
      });
      await getSorSwap(chainId, order);
      expect(
        mockSwapCostCalculator.setNativeAssetPriceInToken
      ).toHaveBeenCalledWith('0xABC', '0');
    });
  });
});
