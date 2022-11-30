
/** expandPool test:
 * Need to get an example of an unexpanded pool with other pool ID's. 
 * Then add those pools to the SDK pools find function
 * Then run expand on the first pool and make sure the subpools are correctly added to it
 * 
 * Example pool: 0xb9bd68a77ccf8314c0dfe51bc291c77590c4e9e6000200000000000000000385
 * wstETH / bb-a-USD
 * It doesn't have the pool ID on the token, but I can find pools by that address
 * and that works well enough. Then just add them on in exactly the same way as the frontend does it. 
 * Only need some of the pool fields, not all of them. 
 */

import { factories } from "../../test/factories";
import { Pool, PoolType, PoolToken, TokenTreePool } from "../../src/types";
import { PoolService } from "../../src/pools/pool.service";
import { 
  BalancerDataRepositories, 
  BalancerSDK, 
  BalancerSdkConfig, 
  PoolsStaticRepository,
  Pool as SDKPool,
} from "@balancer-labs/sdk";
import * as _ from 'lodash';
import { BoostedInfo, LinearParams } from "../../test/factories/pools";

jest.unmock('@balancer-labs/sdk');

const balancerConfig: BalancerSdkConfig = {
  network: 1,
  rpcUrl: '',
};
const balancerSdk = new BalancerSDK(balancerConfig);
const dataRepositories = balancerSdk.data;
const networkConfig = balancerSdk.networkConfig;

function getPoolsRepository(pools: Pool[]) {
  const poolProvider = new PoolsStaticRepository(pools as SDKPool[]);
  const poolsRepositories: BalancerDataRepositories = {
    ...dataRepositories,
    ...{
      pools: poolProvider,
    },
  };
  return poolsRepositories;
}

describe('Pool Service', () => {
  describe('expandPool', () => {
    let linearPools: Pool[];
    let boostedPoolInfo: BoostedInfo;
    let boostedPool: Pool;

    beforeAll(() => {
      const linearPoolDescriptions: LinearParams = {
        pools: [
          {
            tokens: {
              wrappedSymbol: 'aDAI',
              mainSymbol: 'DAI',
            },
            balance: '1000000',
          },
          {
            tokens: {
              wrappedSymbol: 'aUSDC',
              mainSymbol: 'USDC',
            },
            balance: '500000',
          },
          {
            tokens: {
              wrappedSymbol: 'aUSDT',
              mainSymbol: 'USDT',
            },
            balance: '500000',
          },
        ]
      };
      
      const linearPoolInfo = factories.linearPools.transient(linearPoolDescriptions).build();
      linearPools = linearPoolInfo.linearPools;
      
      boostedPoolInfo = factories.boostedPool
        .transient({
          linearPoolInfo,
          rootId: 'phantom_boosted_1',
          rootAddress: 'address_phantom_boosted_1',
        })
        .build();
      boostedPool = boostedPoolInfo.rootPool;
    });

    it('Should return a pool without any subpools as exactly the same', async () => {
      const pool: Pool =  factories.poolBase.build();
      const poolService = new PoolService(pool, networkConfig, getPoolsRepository([]));
      await poolService.expandPool();
      expect(poolService.pool).toEqual(pool);
    });
    
    it('Should add immediate sub-pool information to a pool', async () => {
      const poolService = new PoolService(boostedPool, networkConfig, getPoolsRepository([...linearPools, boostedPool]));
      await poolService.expandPool();
      const tokens = poolService.pool.tokens;
      expect(tokens.length).toBe(4);
      expect(tokens[0].token?.pool).toBeTruthy()
      const tokenTreePoolItems = [
        'id', 'address', 'poolType', 'totalShares', 'mainIndex'
      ]
      expect(tokens[0].token?.pool).toMatchObject(_.pick(linearPools[0], tokenTreePoolItems));
      expect(tokens[1].token?.pool).toMatchObject(_.pick(linearPools[1], tokenTreePoolItems));
      expect(tokens[2].token?.pool).toMatchObject(_.pick(linearPools[2], tokenTreePoolItems));
      expect(tokens[3].token).toBeFalsy(); // This is the BPT token, it shouldn't add a subpool of itself
    });

    it('Should add multiple layers deep of sub-pool to the pool', async () => {
      const stableLinearPoolDescription: LinearParams = {
        pools: [
          {
            tokens: {
              wrappedSymbol: 'aSTABLE',
              mainSymbol: 'STABLE',
            },
            balance: '500000',
          },
        ],
      };
      const linearPoolInfo = factories.linearPools.transient(stableLinearPoolDescription).build();
      const stableLinearPool = linearPoolInfo.linearPools[0];
      const boostedMetaInfo = factories.boostedMetaPool
        .transient({
          rootId: 'id-parent',
          rootAddress: 'address-parent',
          rootBalance: '1000000',
          linearPoolInfo,
          boostedPoolInfo,
        })
        .build();

      const boostedMetaPool: Pool = boostedMetaInfo.rootInfo.pool;

      const poolService = new PoolService(boostedMetaPool, networkConfig, getPoolsRepository([...linearPools, boostedPool, stableLinearPool, boostedMetaPool]));
      await poolService.expandPool();
      const tokens = poolService.pool.tokens;
      expect(tokens.length).toBe(3);
      expect(tokens[0].token?.pool).toBeTruthy()
      const tokenTreePoolItems = [
        'id', 'address', 'poolType', 'totalShares', 'mainIndex'
      ]
      expect(tokens[0].token?.pool).toMatchObject(_.pick(boostedPool, tokenTreePoolItems));
      expect(tokens[1].token?.pool).toMatchObject(_.pick(stableLinearPool, tokenTreePoolItems));
      expect(tokens[2].token).toBeFalsy(); // This is the BPT token, it shouldn't add a subpool of itself
      const boostedPoolTokens: PoolToken[] = tokens[0].token?.pool?.tokens || [];
      expect(boostedPoolTokens[0].token?.pool).toMatchObject(_.pick(linearPools[0], tokenTreePoolItems));
      expect(boostedPoolTokens[1].token?.pool).toMatchObject(_.pick(linearPools[1], tokenTreePoolItems));
      expect(boostedPoolTokens[2].token?.pool).toMatchObject(_.pick(linearPools[2], tokenTreePoolItems));
      expect(boostedPoolTokens[3].token).toBeFalsy(); // This is the BPT token, it shouldn't add a subpool of itself
    });

  })
})