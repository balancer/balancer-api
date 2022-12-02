import { Pool, Token, PoolType } from '../types';
import {
  BalancerDataRepositories,
  PoolsStaticRepository,
  StaticTokenPriceProvider,
  Pool as SDKPool,
  StaticTokenProvider,
  BalancerSdkConfig,
  BalancerSDK,
  BalancerNetworkConfig,
} from '@balancer-labs/sdk';
import { tokensToTokenPrices } from '../tokens';
import { PoolService } from './pool.service';
import debug from 'debug';
import { getInfuraUrl } from '../utils';
import util from 'util';

const log = debug('balancer:pool-decorator');

const IGNORED_POOL_TYPES = [PoolType.Element, PoolType.Gyro2, PoolType.Gyro3];

export interface PoolDecoratorOptions {
  chainId?: number;
  poolsToDecorate?: Pool[];
}

export class PoolDecorator {
  poolsRepositories: BalancerDataRepositories;
  networkConfig: BalancerNetworkConfig;

  constructor(public pools: Pool[], private options: PoolDecoratorOptions) {}

  public async decorate(tokens: Token[]): Promise<Pool[]> {
    log('------- START Decorating pools --------');

    const tokenPrices = tokensToTokenPrices(tokens);

    const poolProvider = new PoolsStaticRepository(this.pools as SDKPool[]);
    const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
    const tokenProvider = new StaticTokenProvider(tokens);

    const chainId = this.options.chainId || 1;

    // poolsToDecorate will be a reference to this.pools, but I think this is ok as we want 
    // the pools in the core list to be updated. Watch out for possible future oddities due to this though.
    const poolsToDecorate = this.options.poolsToDecorate || this.pools;

    const balancerConfig: BalancerSdkConfig = {
      network: chainId,
      rpcUrl: getInfuraUrl(chainId),
    };
    const balancerSdk = new BalancerSDK(balancerConfig);
    const dataRepositories = balancerSdk.data;

    this.poolsRepositories = {
      ...dataRepositories,
      ...{
        pools: poolProvider,
        tokenPrices: tokenPriceProvider,
        tokenMeta: tokenProvider,
      },
    };

    this.networkConfig = balancerSdk.networkConfig;

    let processedPools = [];
    const batchSize = 10;

    log(`Processing ${this.pools.length} pools`);

    for (let i = 0; i < poolsToDecorate.length; i += batchSize) {
      log(`Decorating pools ${i} -> ${i + batchSize}`);
      const batch = await Promise.all(
        poolsToDecorate.slice(i, i + batchSize).map(pool => this.decoratePool(pool))
      );
      processedPools = processedPools.concat(batch);
    }
    
    log('------- END decorating pools --------');

    return processedPools;
  }

  private async decoratePool(pool) {
    if (IGNORED_POOL_TYPES.includes(pool.poolType)) return pool;

    let poolService;
    try {
      poolService = new PoolService(pool, this.networkConfig, this.poolsRepositories);
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
}
