import { Pool, Token } from '../types';
import { StaticPoolRepository, StaticTokenPriceProvider, Pool as SDKPool } from '@balancer-labs/sdk';
import { tokensToTokenPrices } from '../tokens';
import { PoolService } from './pool.service';
import debug from 'debug';

const log = debug('balancer:pool-decorator');

export class PoolDecorator {
  constructor(
    public pools: Pool[]
  ) {}

  public async decorate(tokens: Token[]): Promise<Pool[]> {
    log("------- START Decorating pools --------")
    
    const tokenPrices = tokensToTokenPrices(tokens);
  
    const poolProvider = new StaticPoolRepository(this.pools as SDKPool[]);
    const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);

    const promises = this.pools.map(async pool => {
      const poolService = new PoolService(pool, poolProvider, tokenPriceProvider);

      await poolService.setTotalLiquidity();

      return poolService.pool;
    });

    const pools = await Promise.all(promises);
    log("------- END decorating pools --------")

    return pools;
  }
}