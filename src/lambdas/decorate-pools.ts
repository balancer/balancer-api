
/**
 * This lambda runs after prices have been updated, it updates the liquidity of each pool
 * based on the latest token prices + pool token values.
 */
import { getPools, getTokens, updatePools } from "../data-providers/dynamodb";
import { PoolDecorator } from "../pools/pool.decorator";

const { NETWORK_ID } = process.env;
 
export const handler = async (): Promise<any> => {
  const log = console.log;

  const networkId = parseInt(NETWORK_ID || '1');

  try {
    log("Loading Tokens")
    const tokens = await getTokens(networkId);
    log(`Loaded ${tokens.length} tokens. Loading Pools`) 
    const pools = await getPools(networkId);
    log(`Decoracting ${pools.length} pools for network ${networkId}`)
    const decorateStartTime = Date.now();
    const poolDecorator = new PoolDecorator(pools, networkId);
    const decoratedPools = await poolDecorator.decorate(tokens);
    log(`Decorated ${decoratedPools.length} pools`);
    const modifiedPools = decoratedPools.filter((pool) => pool.lastUpdate >= decorateStartTime);
    log(`Saving ${modifiedPools.length} modified pools to the database`);
    await updatePools(modifiedPools);
    log(`Saved decorated pools for network ${networkId}`);
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
