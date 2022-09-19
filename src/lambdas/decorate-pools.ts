
/**
 * This lambda runs after prices have been updated, it updates the liquidity of each pool
 * based on the latest token prices + pool token values.
 */
import { getPools, getTokens, updatePools } from "../data-providers/dynamodb";
import { PoolDecorator } from "../pools/pool.decorator";

const { CHAIN_ID } = process.env;
 
export const handler = async (): Promise<any> => {
  const log = console.log;

  const chainId = parseInt(CHAIN_ID || '1');

  try {
    log("Loading Tokens")
    const tokens = await getTokens(chainId);
    log(`Loaded ${tokens.length} tokens. Loading Pools`) 
    const pools = await getPools(chainId);
    log(`Decoracting ${pools.length} pools for chain ${chainId}`)
    const decorateStartTime = Date.now();
    const poolDecorator = new PoolDecorator(pools, chainId);
    const decoratedPools = await poolDecorator.decorate(tokens);
    log(`Decorated ${decoratedPools.length} pools`);
    const modifiedPools = decoratedPools.filter((pool) => pool.lastUpdate >= decorateStartTime);
    log(`Saving ${modifiedPools.length} modified pools to the database`);
    await updatePools(modifiedPools);
    log(`Saved decorated pools for chain ${chainId}`);
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
