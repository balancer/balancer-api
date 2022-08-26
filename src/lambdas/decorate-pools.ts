
/**
 * This lambda runs after prices have been updated, it updates the liquidity of each pool
 * based on the latest token prices + pool token values.
 */
import { getPools, getTokens, updatePools } from "../data-providers/dynamodb";
import { PoolDecorator } from "../pools/pool.decorator";
 
export const handler = async (): Promise<any> => {
  const log = console.log;

  try {
    log("Loading Tokens")
    const tokens = await getTokens();
    log(`Loaded ${tokens.length} tokens. Loading Pools`) 
    const pools = await getPools();
    log(`Decoracting ${pools.length} Pools`)
    const decorateStartTime = Date.now();
    const poolDecorator = new PoolDecorator(pools);
    const decoratedPools = await poolDecorator.decorate(tokens);
    log(`Decorated ${decoratedPools.length} pools`);
    const modifiedPools = decoratedPools.filter((pool) => pool.lastUpdate >= decorateStartTime);
    log(`Saving ${modifiedPools.length} modified pools to the database`);
    await updatePools(modifiedPools);
    log("Saved decorated pools");
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
