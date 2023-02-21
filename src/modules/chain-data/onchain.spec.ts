import { PoolType, SubgraphPoolBase } from '@balancer-labs/sdk';
import { Pool } from '@/modules/pools';
import { fetchTokens, fetchPoolsFromChain } from './onchain';
import { subgraphPoolBase } from '../../../tests/factories/sor';
import { poolBase } from '../../../tests/factories/pools';

jest.mock('@balancer-labs/sdk');
jest.mock('@ethersproject/providers');
jest.mock('@ethersproject/contracts');

describe('onchain data-provider', () => {
  describe('fetchPoolsFromChain', () => {
    it('Should return a list of pools from SOR, even if subgraph has none', async () => {
      const sorPools: SubgraphPoolBase[] = [subgraphPoolBase.build()];
      require('@balancer-labs/sdk')._setSorPools(sorPools);
      const pools = await fetchPoolsFromChain(1);
      expect(pools.length).toBe(1);
      expect(pools[0].id).toBe(sorPools[0].id);
    });

    it('Should add subgraph information if there is a subgraph pools', async () => {
      const sorPools: SubgraphPoolBase[] = [subgraphPoolBase.build()];
      require('@balancer-labs/sdk')._setSorPools(sorPools);
      const subgraphPools: Pool[] = [
        poolBase.build(),
      ];
      require('@balancer-labs/sdk')._setSubgraphPools(subgraphPools);
      const pools = await fetchPoolsFromChain(1);
      expect(pools.length).toBe(1);
      expect(pools[0].protocolSwapFeeCache).toBe('0');
      expect(pools[0].poolType).toBe(PoolType.Weighted);
    });

    it('Should over-write token priceRates with subgraph data', async () => {
      const newPriceRate = "1.15";
      const sorPools: SubgraphPoolBase[] = [subgraphPoolBase.build()];
      sorPools[0].tokens[0].priceRate = newPriceRate;
      require('@balancer-labs/sdk')._setSorPools(sorPools);
      const subgraphPools: Pool[] = [
        poolBase.build(),
      ];
      require('@balancer-labs/sdk')._setSubgraphPools(subgraphPools);
      const pools = await fetchPoolsFromChain(1);
      expect(pools.length).toBe(1);
      expect(pools[0].tokens[0].priceRate).toBe(newPriceRate);
    });
  });

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
