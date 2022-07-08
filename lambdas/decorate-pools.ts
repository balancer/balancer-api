
/**
 * This lambda runs after prices have been updated, it updates the liquidity of each pool
 * based on the latest token prices + pool token values.
 */
import { getPools, getTokens, updatePools } from "../src/data-providers/dynamodb";
import { PoolDecorator } from "../src/pools/pool.decorator";
 
export const handler = async (event: any = {}): Promise<any> => {
  const log = console.log;

  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return { statusCode: 400, body: `Error: You are missing the chainId` };
  }

  try {
    log("Loading Tokens")
    const tokens = await getTokens();
    log(`Loaded ${tokens.length} tokens. Loading Pools`) 
    const pools = await getPools(chainId);
    log(`Decoracting ${pools.length} Pools`)
    const poolDecorator = new PoolDecorator(pools);
    const decoratedPools = await poolDecorator.decorate(tokens);
    log(`Saving ${decoratedPools.length} pools to database`);
    await updatePools(decoratedPools);
    log("Saved decorated pools");
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
