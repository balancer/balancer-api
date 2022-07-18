import { Pool } from '../types';
import { Pool as SDKPool, PoolRepository, TokenPriceProvider, Liquidity  } from "@balancer-labs/sdk";


export class PoolService {

  constructor(
    public pool: Pool,
    private poolRepository: PoolRepository,
    private tokenPriceProvider: TokenPriceProvider,
  ) {}

  /**
   * @summary Calculates and sets total liquidity of pool.
   */
  public async setTotalLiquidity(): Promise<number> {
    const liquidityProvider = new Liquidity(this.poolRepository, this.tokenPriceProvider);
  
    if (this.pool.poolType === 'Element') return 0;

    let poolLiquidity = 0;
    try {
      const calculatedLiquidity = await liquidityProvider.getLiquidity(this.pool as SDKPool);
      poolLiquidity = Number(calculatedLiquidity);
    } catch (e) {
      console.log("Failed to calculate liquidity. Error is: ", e);
      console.log("Pool is: ", this.pool);
      console.log("Tokens are: ", await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      })));
      return 0;
    }

    if (Number(poolLiquidity) == 0 && Number(this.pool.totalLiquidity) > 0) {
      console.log("Failed to calculate liquidity for pool: ", this.pool);
      console.log("Tokens are: ", await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      })));
    }

    if (this.pool.graphData?.totalLiquidity || this.pool.totalLiquidity || poolLiquidity && poolLiquidity !== this.pool.totalLiquidity) {
      console.log(`Updating Liquidity for Pool: ${this.pool.id} on chain: ${this.pool.chainId}\n
      Graph Provided Liquidity: \t ${this.pool.graphData?.totalLiquidity}\n
      Current Liquidity: \t\t\t", ${this.pool.totalLiquidity}\n
      Re-calculated liquidity: \t", ${poolLiquidity}\n
      ---`);
    }

    if (poolLiquidity !== this.pool.totalLiquidity) {
      this.pool.lastUpdate = Date.now();
    }

    return (this.pool.totalLiquidity = poolLiquidity);
  }

}