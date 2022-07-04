import { Pool } from '../types';
import { Pool as SDKPool, TokenPrices, PoolProvider, TokenPriceProvider, Liquidity  } from "@balancer-labs/sdk";


export class PoolService {

  constructor(
    public pool: Pool,
    private poolProvider: PoolProvider,
    private tokenPriceProvider: TokenPriceProvider,
  ) {}

  /**
   * @summary Calculates and sets total liquidity of pool.
   */
  public async setTotalLiquidity(): Promise<string> {
    const liquidityProvider = new Liquidity(this.poolProvider, this.tokenPriceProvider);
  
    if (this.pool.poolType === 'Element') return '0';

    let poolLiquidity = '0';
    try {
      poolLiquidity = await liquidityProvider.getLiquidity(this.pool as SDKPool);
    } catch (e) {
      console.log("Failed to calculate liquidity. Error is: ", e);
      console.log("Pool is: ", this.pool);
      console.log("Tokens are: ", await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      })));
      return '0';
    }

    if (this.pool.id === '0xcf3ae4b9235b1c203457e472a011c12c3a2fde93000100000000000000000019' || (Number(poolLiquidity) == 0 && Number(this.pool.totalLiquidity) > 0)) {
      console.log("Failed to calculate liquidity for pool: ", this.pool);
      console.log("Tokens are: ", await Promise.all(this.pool.tokens.map(async (token) => {
        const tokenPrice = await this.tokenPriceProvider.find(token.address)
        return {...token, ...{price: tokenPrice}}
      })));
    }

    console.log("Updating Liquidity for Pool: ", this.pool.id, " on chain: ", this.pool.chainId);
    console.log("Current Liquidity: \t\t", this.pool.totalLiquidity);
    console.log("Re-calculated liquidity: \t", poolLiquidity);
    console.log("---");

    return (this.pool.totalLiquidity = poolLiquidity);
  }

}