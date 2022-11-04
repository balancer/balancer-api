import { fetchTokens } from './onchain';

jest.mock('@balancer-labs/sdk');
jest.mock('@ethersproject/providers');
jest.mock('@ethersproject/contracts');

describe('onchain data-provider', () => {
  describe('fetchTokens', () => {
    it('Should return 6 decimals when fetching a token that has that many', async () => {
      require('@ethersproject/contracts')._setDecimalsMethod(() =>
        Promise.resolve(6)
      );
      const tokens = await fetchTokens(1, [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ]);
      expect(tokens.length).toBe(1);
      expect(tokens[0].decimals).toBe(6);
    });

    it('Should default decimals to 18 when fetching a token that doesnt have decimals', async () => {
      require('@ethersproject/contracts')._setDecimalsMethod(() => {
        throw 'Invalid Function';
      });
      const tokens = await fetchTokens(137, [
        '0xa7fD7D83E2d63f093b71C5F3B84c27cFF66A7802',
      ]);
      expect(tokens.length).toBe(1);
      expect(tokens[0].decimals).toBe(18);
    });
  });
});
