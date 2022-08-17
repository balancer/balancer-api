import { Pool } from '../../src/types';
import { Pools, PoolModel, PoolRepository, TokenPriceProvider, Liquidity, BalancerNetworkConfig, BalancerDataRepositories, AprBreakdown  } from '@balancer-labs/sdk';
import util from 'util';
import debug from 'debug';
import { isEqual } from 'lodash';
import { isValidApr } from '../utils';

const log = debug('balancer:pools')

export class PoolService {
  poolModel: PoolModel;

  constructor(
    public pool: Pool,
    private networkConfig: BalancerNetworkConfig,
    private repositories: BalancerDataRepositories
  ) {
    this.poolModel = Pools.wrap(pool, networkConfig, repositories)
  }

  /**
   * @summary Calculates and sets total liquidity of pool.
   */
  public async setTotalLiquidity(): Promise<string> {
    if (this.pool.poolType === 'Element') return '0';

    let poolLiquidity = '0';
    try {
      const calculatedLiquidity = await this.poolModel.liquidity();
      poolLiquidity = calculatedLiquidity;
    } catch (e) {
      console.error(
        `Failed to calculate liquidity. Error is:  ${e}\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n`
      );
      return '0';
    }

    if (Number(poolLiquidity) == 0 && Number(this.pool.totalLiquidity) > 0) {
      console.error(
        `Failed to calculate liquidity. Calculator returned ${poolLiquidity}\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n`
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

  

  public async setApr(): Promise<AprBreakdown> {
    log("Calculating APR for pool: ", this.pool.id);

    let poolApr: AprBreakdown = {
      swapFees: 0,
      tokenAprs: 0,
      stakingApr: {
        min: 0,
        max: 0,
      },
      rewardsApr: 0,
      protocolApr: 0,
      min: 0,
      max: 0,
    }

    if (Number(this.pool.totalLiquidity) < 100) {
      log(`Pool only has ${this.pool.totalLiquidity} liquidity. Not processing`);
      return (this.pool.apr = poolApr); // Don't bother calculating APR for pools with super low liquidity
    } 

    this.poolModel.totalLiquidity = this.pool.totalLiquidity; // Need to sync calculated liquidity for APR calculations

    try {
      const apr = await this.poolModel.apr();
      if (!isValidApr(apr)) {
        throw new Error('APR is invalid - contains NaN');
      }
      poolApr = apr;
    } catch (e) {
      console.error(
        `Failed to calculate APR. Error is:  ${e}\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n`
      );
      return poolApr;
    }

    if (!isEqual(poolApr, this.pool.apr)) {
      console.log(`Updated pool ${this.pool.id} to APR: `, poolApr);
      this.pool.lastUpdate = Date.now();
    }

    return (this.pool.apr = poolApr);
  }
}