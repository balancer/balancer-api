import { Pool, Token, PoolType } from '../types';
import {
  BalancerDataRepositories,
  PoolsStaticRepository,
  StaticTokenPriceProvider,
  Pool as SDKPool,
  StaticTokenProvider,
  BalancerSdkConfig,
  BalancerSDK,
} from '@balancer-labs/sdk';
import { tokensToTokenPrices } from '../tokens';
import { PoolService } from './pool.service';
import debug from 'debug';
import { getInfuraUrl } from '../utils';
import util from 'util';

const log = debug('balancer:pool-decorator');

const IGNORED_POOL_TYPES = [PoolType.Element, PoolType.Gyro2, PoolType.Gyro3];

export class PoolDecorator {
  constructor(public pools: Pool[], private networkId: number = 1) {}

  public async decorate(tokens: Token[]): Promise<Pool[]> {
    log('------- START Decorating pools --------');

    const tokenPrices = tokensToTokenPrices(tokens);

    const poolProvider = new PoolsStaticRepository(this.pools as SDKPool[]);
    const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
    const tokenProvider = new StaticTokenProvider(tokens);

    const balancerConfig: BalancerSdkConfig = {
      network: this.networkId,
      rpcUrl: getInfuraUrl(this.networkId),
    };
    const balancerSdk = new BalancerSDK(balancerConfig);
    const dataRepositories = balancerSdk.data;

    const poolsRepositories: BalancerDataRepositories = {
      ...dataRepositories,
      ...{
        pools: poolProvider,
        tokenPrices: tokenPriceProvider,
        tokenMeta: tokenProvider,
      },
    };

    const networkConfig = balancerSdk.networkConfig;

    async function decoratePool(pool) {
      if (IGNORED_POOL_TYPES.includes(pool.poolType)) return pool;

      let poolService;
      try {
        poolService = new PoolService(pool, networkConfig, poolsRepositories);
      } catch (e) {
        console.log(
          `Failed to initialize pool service. Error is: ${e}. Pool is:  ${util.inspect(
            pool,
            false,
            null
          )}`
        );
        return pool;
      }

      try {
        await poolService.setTotalLiquidity();
        await poolService.setApr();
        await poolService.setVolumeSnapshot();
        await poolService.expandPool();
        poolService.setIsNew();
      } catch (e) {
        console.log(`Failed to decorate pool ${pool.id} Error is: ${e}. Pool is: ${util.inspect(
          pool,
          false,
          null
        )}`)
      }

      return poolService.pool;
    }

    let processedPools = [];
    const batchSize = 10;

    log(`Processing ${this.pools.length} pools`);

    for (let i = 0; i < this.pools.length; i += batchSize) {
      log(`Decorating pools ${i} -> ${i + batchSize}`);
      const batch = await Promise.all(
        this.pools.slice(i, i + batchSize).map(pool => decoratePool(pool))
      );
      processedPools = processedPools.concat(batch);
    }
    
    log('------- END decorating pools --------');

    return processedPools;
  }
}
