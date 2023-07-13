import { Factory } from 'fishery';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { PoolType, PoolToken } from '@sobal/sdk';
import { formatAddress, formatId } from '@tests/lib/utils';
import { Zero, WeiPerEther } from '@ethersproject/constants';
import { Pool } from '@/modules/pools';
import { namedTokens } from './named-tokens';

export type PoolParams = {
  type: PoolType;
  id?: string;
};

type LinearTokens = {
  wrappedSymbol: string;
  mainSymbol: string;
};

export type LinearParams = {
  pools: {
    tokens: LinearTokens;
    balance: string;
  }[];
};

export type LinearInfo = {
  linearPools: Pool[];
  totalBalance: string;
  mainTokens: PoolToken[];
  wrappedTokens: PoolToken[];
  linearPoolTokens: PoolToken[];
};

export interface ComposableStableParams {
  id: string;
  symbol: string;
  address: string;
  childTokens: PoolToken[];
  tokenbalance: string;
}

export type ComposableStableInfo = {
  pool: Pool;
  poolToken: PoolToken;
};

export interface BoostedParams {
  linearPoolInfo: LinearInfo;
  rootId: string;
  rootAddress: string;
  rootBalance: string;
}

export interface BoostedInfo extends LinearInfo {
  rootPool: Pool;
  rootPoolToken: PoolToken;
}

export interface BoostedMetaParams {
  boostedPoolInfo: BoostedInfo;
  linearPoolInfo: LinearInfo;
  rootId: string;
  rootAddress: string;
  rootBalance: string;
}

export interface ChildBoostedInfo extends BoostedInfo {
  proportion: string;
}

export interface BoostedMetaInfo {
  rootInfo: ComposableStableInfo;
  boostedPoolInfo: ChildBoostedInfo;
  linearPoolInfo: LinearInfo;
}

export interface BoostedMetaBigParams {
  rootId: string;
  rootAddress: string;
  rootBalance: string;
  childPools: BoostedParams[];
}

export interface BoostedMetaBigInfo {
  rootPool: Pool;
  rootPoolToken: PoolToken;
  childPoolsInfo: ChildBoostedInfo[];
  childPools: Pool[];
}

const poolBase = Factory.define<Pool, PoolParams>(({ params, afterBuild }) => {
  afterBuild(pool => {
    pool.tokensList = pool.tokens.map(t => t.address);
  });

  const type = params.poolType || PoolType.Weighted;

  const tokens = params.tokens || [
    poolToken.transient({ symbol: 'wETH' }).build(),
    poolToken.transient({ symbol: 'wBTC' }).build(),
  ];

  return {
    id:
      params.id ||
      '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
    address: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
    name: 'Default Pool',
    chainId: 1,
    poolType: type,
    poolTypeVersion: 1,
    protocolYieldFeeCache: '0',
    protocolSwapFeeCache: '0',
    swapFee: '0.001',
    swapEnabled: true,
    tokens,
    tokensList: [],
    totalWeight: '1',
    totalShares: '1',
    totalLiquidity: '0',
    lowerTarget: '',
    upperTarget: '',
  };
});

const poolToken = Factory.define<PoolToken>(({ transientParams }) => {
  const { symbol, balance = '1', weight = '1', address } = transientParams;
  let namedToken = namedTokens[symbol];
  if (!namedToken) {
    namedToken = {};
    namedToken.address = formatAddress(address ?? `address_${symbol}`);
    namedToken.decimals = 18;
  }
  return {
    ...namedToken,
    balance,
    priceRate: '1',
    weight,
    symbol,
  };
});

/*
Create a set of Linear pools and associated tokens:
LinearPools consisting of wrappedToken, mainToken, composableBpt
*/
const linearPools = Factory.define<LinearInfo, LinearParams>(
  ({ transientParams }) => {
    const { pools } = transientParams;
    if (pools === undefined) throw new Error('Need linear pool params');
    const linearPools: Pool[] = [];
    const mainTokens: PoolToken[] = [];
    const wrappedTokens: PoolToken[] = [];
    const linearPoolTokens: PoolToken[] = [];

    const totalBalance = pools.reduce(
      (total: BigNumber, pool) => total.add(pool.balance),
      Zero
    );
    pools?.forEach(pool => {
      const poolAddress = formatAddress(
        `address-${pool.tokens.mainSymbol}_${pool.tokens.wrappedSymbol}`
      );
      const mainToken = poolToken
        .transient({
          symbol: pool.tokens.mainSymbol,
          balance: '1000000',
        })
        .build();
      const wrappedToken = poolToken
        .transient({
          symbol: pool.tokens.wrappedSymbol,
          balance: '9711834',
        })
        .build();
      const composableBptToken = poolToken
        .transient({
          symbol: `b${pool.tokens.mainSymbol}_${pool.tokens.wrappedSymbol}`,
          balance: '5192296829399898',
          address: poolAddress,
        })
        .build();
      const linearPool = poolBase.build({
        id: formatId(
          `id-${pool.tokens.mainSymbol}_${pool.tokens.wrappedSymbol}`
        ),
        address: poolAddress,
        poolType: PoolType.AaveLinear,
        tokens: [mainToken, wrappedToken, composableBptToken],
        wrappedIndex: 1,
        mainIndex: 0,
        tokensList: [
          mainToken.address,
          wrappedToken.address,
          composableBptToken.address,
        ],
        lowerTarget: '1',
        upperTarget: '1',
      });
      // Update the pool token to have the expected balance set in input
      composableBptToken.balance = pool.balance;
      linearPoolTokens.push(composableBptToken);
      mainTokens.push(mainToken);
      wrappedTokens.push(wrappedToken);
      linearPools.push({
        ...linearPool,
      });
    });
    return {
      linearPools,
      totalBalance: totalBalance.toString(),
      mainTokens,
      wrappedTokens,
      linearPoolTokens,
    };
  }
);

/*
Create and return a composableStable pool (with composableBpt) and token.
*/
const composableStablePool = Factory.define<
  ComposableStableInfo,
  ComposableStableParams
>(({ transientParams }) => {
  const { id, address, symbol, childTokens, tokenbalance } = transientParams;
  // Create composableStable BPT
  const composableBptToken = poolToken
    .transient({
      symbol,
      balance: '5192296829399898', // need composableBpt balance for pool
      address,
    })
    .build();

  // Create composableStable pool
  const pool = poolBase.build({
    poolType: PoolType.ComposableStable,
    id,
    address,
    totalWeight: undefined,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tokens: [...childTokens!, composableBptToken],
    amp: '1',
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  composableBptToken.balance = tokenbalance!;

  return {
    pool: { ...pool, proportionOfParent: '1' },
    poolToken: composableBptToken,
  };
});

/*
Check a boostedPool, a composableStable with all constituents being Linear.
Also creates associated LinearPools consisting of wrappedToken, mainToken, composableBpt.
*/
const boostedPool = Factory.define<BoostedInfo, BoostedParams>(
  ({ transientParams }) => {
    const {
      linearPoolInfo,
      rootAddress = 'address_root',
      rootId = 'id_root',
      rootBalance = '1000000',
    } = transientParams;
    if (!linearPoolInfo)
      throw new Error('Boosted Pool requires linear Pool Info');

    const rootPoolParams = {
      id: formatId(rootId),
      symbol: 'bRootPool',
      address: formatAddress(rootAddress),
      childTokens: linearPoolInfo.linearPoolTokens,
      tokenbalance: rootBalance,
    };
    const rootInfo = composableStablePool.build(
      {},
      { transient: rootPoolParams }
    );

    return {
      rootPool: rootInfo.pool,
      rootPoolToken: rootInfo.poolToken,
      totalBalance: rootBalance,
      linearPools: linearPoolInfo.linearPools,
      mainTokens: linearPoolInfo.mainTokens,
      wrappedTokens: linearPoolInfo.wrappedTokens,
      linearPoolTokens: linearPoolInfo.linearPoolTokens,
    };
  }
);

/*
Check a boostedMetaPool, a composableStable with one Linear and one boosted.
Also creates associated boosted and LinearPools consisting of wrappedToken, mainToken, composableBpt.
*/
const boostedMetaPool = Factory.define<BoostedMetaInfo, BoostedMetaParams>(
  ({ transientParams }) => {
    const {
      boostedPoolInfo,
      linearPoolInfo,
      rootAddress,
      rootId,
      rootBalance,
    } = transientParams;

    if (boostedPoolInfo === undefined || linearPoolInfo === undefined)
      throw Error('Missing Pool Params.');

    const rootTokenBalanceBoosted = BigNumber.from(
      boostedPoolInfo.totalBalance
    );
    const rootTokenBalanceLiner = BigNumber.from(linearPoolInfo.totalBalance);
    const totalTokenBalance = rootTokenBalanceBoosted.add(
      rootTokenBalanceLiner
    );

    const childBoostedProportion = formatFixed(
      rootTokenBalanceBoosted
        .mul(BigNumber.from(WeiPerEther))
        .div(totalTokenBalance),
      18
    );

    const childBoostedBpt = boostedPoolInfo.rootPoolToken;

    const rootPoolParams = {
      id: formatId(rootId as string),
      symbol: 'rootPool',
      address: formatAddress(rootAddress as string),
      childTokens: [childBoostedBpt, ...linearPoolInfo.linearPoolTokens],
      tokenbalance: rootBalance,
    };
    const rootInfo = composableStablePool.build(
      {},
      { transient: rootPoolParams }
    );

    return {
      rootInfo,
      boostedPoolInfo: {
        ...boostedPoolInfo,
        proportion: childBoostedProportion,
      },
      linearPoolInfo,
    };
  }
);

/*
Check a boostedMetaBigPool, a composableStable with two boosted.
Also creates associated boosted and LinearPools consisting of wrappedToken, mainToken, composableBpt.
*/
const boostedMetaBigPool = Factory.define<
  BoostedMetaBigInfo,
  BoostedMetaBigParams
>(({ transientParams }) => {
  const childPoolsInfo: ChildBoostedInfo[] = [];
  // These will be used in parent pool
  const childPoolTokens: PoolToken[] = [];
  // These will include composableStables and linear pools
  const childPools: Pool[] = [];

  if (transientParams.childPools === undefined)
    throw new Error(`Can't create boostedMetaBig without child pools.`);

  // TO DO - need proportions
  let totalTokenBalance = Zero;
  for (let i = 0; i < transientParams.childPools.length; i++) {
    const balance = transientParams.childPools[i].rootBalance;
    totalTokenBalance = totalTokenBalance.add(balance);
  }

  // Create each child boostedPool
  for (let i = 0; i < transientParams.childPools.length; i++) {
    const childPool = transientParams.childPools[i];
    const proportion = formatFixed(
      BigNumber.from(childPool.rootBalance)
        .mul(WeiPerEther)
        .div(totalTokenBalance),
      18
    );
    childPool.parentsProportion = proportion;
    const childBoosted = boostedPool.transient(childPool).build();
    childPoolsInfo.push({ ...childBoosted, proportion });
    childPools.push(childBoosted.rootPool, ...childBoosted.linearPools);
    childPoolTokens.push(childBoosted.rootPoolToken);
  }

  const composableParams = {
    id: formatId(transientParams.rootId as string),
    symbol: 'parentComposable',
    address: formatAddress(transientParams.rootAddress as string),
    childTokens: childPoolTokens,
    tokenbalance: transientParams.rootBalance,
  };
  const rootInfo = composableStablePool.build(
    {},
    { transient: composableParams }
  );

  return {
    rootPool: rootInfo.pool,
    rootPoolToken: rootInfo.poolToken,
    childPoolsInfo,
    childPools,
  };
});

export {
  poolBase,
  linearPools,
  boostedPool,
  boostedMetaPool,
  boostedMetaBigPool,
};
