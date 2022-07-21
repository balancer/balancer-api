import { Pool } from '../types';
import { Pool as SDKPool, PoolRepository, TokenPriceProvider, Liquidity  } from "@balancer-labs/sdk";
import util from 'util';
import debug from 'debug';

const log = debug('balancer:pools')

export class PoolService {
  constructor(
    public pool: Pool,
    private poolRepository: PoolRepository,
    private tokenPriceProvider: TokenPriceProvider,
  ) {}

  /**
   * @summary Calculates and sets total liquidity of pool.
   */
  public async setTotalLiquidity(): Promise<string> {
    const liquidityProvider = new Liquidity(this.poolRepository, this.tokenPriceProvider);
  
    if (this.pool.poolType === 'Element') return '0';

    let poolLiquidity = '0';
    try {
      const calculatedLiquidity = await liquidityProvider.getLiquidity(this.pool as SDKPool);
      poolLiquidity = calculatedLiquidity;
    } catch (e) {
      const poolTokens = await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      }));
      console.error(
        `Failed to calculate liquidity. Error is:  ${e}\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n
        Tokens are: ${util.inspect(poolTokens, false, null)}`
      );
      return '0';
    }

    if (Number(poolLiquidity) == 0 && Number(this.pool.totalLiquidity) > 0) {
      const poolTokens = await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      }));
      console.error(
        `Failed to calculate liquidity.\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n
        Tokens are: ${util.inspect(poolTokens, false, null)}`
      );
    }

    if (this.pool.graphData?.totalLiquidity || this.pool.totalLiquidity || poolLiquidity && poolLiquidity !== this.pool.totalLiquidity) {
      log(
        `Updating Liquidity for Pool: ${this.pool.id} on chain: ${this.pool.chainId}\n
        Graph Provided Liquidity: \t ${this.pool.graphData?.totalLiquidity}\n
        Current Liquidity: \t\t\t", ${this.pool.totalLiquidity}\n
        Re-calculated liquidity: \t", ${poolLiquidity}\n
        ---`
      );
    }

    if (poolLiquidity !== this.pool.totalLiquidity) {
      this.pool.lastUpdate = Date.now();
    }

    return (this.pool.totalLiquidity = poolLiquidity);
  }

}