import { updatePools } from "../src/dynamodb";
import { fetchPoolsFromChain } from "../src/sor";

export const handler = async (): Promise<any> => {
  const log = console.log;

  log(`Fetching pools from chain`)
  const pools = await fetchPoolsFromChain();

  try {
    log(`Updating Pools`)
    await updatePools(pools);
    log(`Saved pools`);
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    log(`Received db error: ${dbError}`);
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
