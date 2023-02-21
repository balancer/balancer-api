import { Price } from '@balancer-labs/sdk';

/** Formats a price correctly for storage. Does the following:
 *  - Converts prices in scientific notation to decimal (e.g. 1.63e-7 => 0.000000163)
 *
 */
export function formatPrice(price: Price): Price {
  const formattedPrice: Price = {};
  Object.entries(price).forEach(([currency, value]) => {
    formattedPrice[currency] = new OldBigNumber(value).toFixed();
  });

  return formattedPrice;
}