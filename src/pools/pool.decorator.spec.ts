import { PoolDecorator } from './pool.decorator';
import TOKENS from '../../test/mocks/tokens.json';
import POOLS from '../../test/mocks/pools';

jest.unmock('@balancer-labs/sdk');

describe('poolDecorator', () => {
  describe('Happy Case', () => {
    let poolDecorator;

    beforeAll(() => {
      const pools = POOLS.slice(0, 2)
      poolDecorator = new PoolDecorator(pools, 1);

    });

    it('Should set the liquidity of the pools correctly', async () => {
      const decoratedPools = await poolDecorator.decorate(TOKENS);
      console.log('Got decorated pools: ', decoratedPools);
      expect(decoratedPools.length).toBe(2);
      expect(decoratedPools[0].totalLiquidity).toBeGreaterThan(0);
      expect(decoratedPools[0].apr).toBeTruthy();
    });
  })
})