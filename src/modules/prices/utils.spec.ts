import { Price } from '@sobal/sdk';
import { formatPrice } from './utils';

describe('prices utils', () => {
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
});
