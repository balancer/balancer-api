import { Pool } from '../../src/types';
import { Pools, BalancerNetworkConfig, BalancerDataRepositories, AprBreakdown  } from '@balancer-labs/sdk';
import util from 'util';
import debug from 'debug';
import { isEqual } from 'lodash';
import { isValidApr } from '../utils';
import { WEEK_IN_MS } from '../constants';

const log = debug('balancer:pools')

export class PoolService {
  pools: Pools;

  constructor(
    public pool: Pool,
    networkConfig: BalancerNetworkConfig,
    repositories: BalancerDataRepositories
  ) {
    this.pools = new Pools(networkConfig, repositories)
  }

  /**
   * @summary Calculates and sets total liquidity of pool.
   */
  public async setTotalLiquidity(): Promise<string> {
    if (this.pool.poolType === 'Element') return '0';

    let poolLiquidity = '0';
    try {
      const calculatedLiquidity = await this.pools.liquidity(this.pool);
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
      tokenAprs: {
        total: 0,
        breakdown: {},
      },
      stakingApr: {
        min: 0,
        max: 0,
      },
      rewardAprs: {
        total: 0,
        breakdown: {},
      },
      protocolApr: 0,
      min: 0,
      max: 0,
    }

    if (Number(this.pool.totalLiquidity) < 100) {
      log(`Pool only has ${this.pool.totalLiquidity} liquidity. Not processing`);
      return (this.pool.apr = poolApr); // Don't bother calculating APR for pools with super low liquidity
    } 

    try {
      const apr = await this.pools.apr(this.pool);
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

  public async setVolumeSnapshot(): Promise<string> {
    let volumeSnapshot = '0';

    if (Number(this.pool.totalSwapVolume) < 100) {
      log(`Pool only has ${this.pool.totalSwapVolume} volume. Not processing`);
      return (this.pool.volumeSnapshot = volumeSnapshot); // Don't bother calculating Volume snapshots for pools with super low volume
    } 

    try {
      const volume = await this.pools.volume(this.pool);
      volumeSnapshot = volume.toString();
    } catch (e) {
      console.error(
        `Failed to calculate Volume. Error is:  ${e}\n
        Pool is:  ${util.inspect(this.pool, false, null)}\n`
      );
      return volumeSnapshot;
    }

    if (volumeSnapshot !== this.pool.volumeSnapshot) {
      console.log(`Updated pool ${this.pool.id} to Volume:  `, volumeSnapshot);
      this.pool.lastUpdate = Date.now();
    }

    return (this.pool.volumeSnapshot = volumeSnapshot);
  }

  public setIsNew(): boolean {
    if (!this.pool.createTime) return false;

    const isNew = Date.now() - (this.pool.createTime * 1000) < WEEK_IN_MS;

    return (this.pool.isNew = isNew);
  }
}