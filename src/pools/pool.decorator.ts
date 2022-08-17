import { Pool, Token } from '../types';
import { BalancerDataRepositories, PoolsStaticRepository, StaticTokenPriceProvider, Pool as SDKPool, Pools, StaticTokenProvider, BalancerNetworkConfig, BalancerSdkConfig, BalancerSDK, PoolType } from '@balancer-labs/sdk';
import { tokensToTokenPrices } from '../tokens';
import { PoolService } from './pool.service';
import debug from 'debug';
import { getInfuraUrl } from '../utils';
import { chunk, flatten } from 'lodash';
import util from 'util';

const log = debug('balancer:pool-decorator');

export class PoolDecorator {
  constructor(
    public pools: Pool[],
    private chainId: number = 1
  ) {}

  public async decorate(tokens: Token[]): Promise<Pool[]> {
    log("------- START Decorating pools --------")
    
    const tokenPrices = tokensToTokenPrices(tokens);
  
    const poolProvider = new PoolsStaticRepository(this.pools as SDKPool[]);
    const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
    const tokenProvider = new StaticTokenProvider(tokens);

    const balancerConfig: BalancerSdkConfig = {
      network: this.chainId,
      rpcUrl: getInfuraUrl(this.chainId),
    }
    const balancerSdk = new BalancerSDK(balancerConfig);
    const networkConfig = balancerSdk.networkConfig;
    const dataRepositories = balancerSdk.dataRepositories;

    const poolsRepositories: BalancerDataRepositories = {
      ...dataRepositories,
      ...{
        pools: poolProvider,
        tokenPrices: tokenPriceProvider,
        tokenMeta: tokenProvider,
      }
    }

    async function decoratePool(pool) {
      if (pool.poolType === PoolType.Element) return pool;

      let poolService;
      try {
        poolService = new PoolService(pool, networkConfig, poolsRepositories);
      } catch (e) {
        console.log(`Failed to initialize pool service. Error is: ${e}. Pool is:  ${util.inspect(pool, false, null)}`);
        return pool;
      }

      await poolService.setTotalLiquidity();
      await poolService.setApr();

      return poolService.pool;
    }

    let processedPools = [];
    const batchSize = 10;

    log(`Processing ${this.pools.length} pools`);
    
    for (let i = 0; i < this.pools.length; i += batchSize) {
      log(`Processing pools ${i} -> ${i+batchSize}`);
      const batch = await Promise.all(this.pools.slice(i, i + batchSize).map((pool) => decoratePool(pool)));
      processedPools = processedPools.concat(batch);
    }

    log("------- END decorating pools --------")

    return processedPools;
  }
}