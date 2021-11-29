import { Network } from "types";
import { updatePools } from "../src/dynamodb";
import { fetchPoolsFromChain } from "../src/sor";

export const handler = async (event: any = {}): Promise<any> => {
  const log = console.log;

  let chainId = Network.MAINNET;

  if (event.body) {
    const eventBody = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
    chainId = eventBody.chainId || Network.MAINNET;
    if (!Object.values(Network).includes(chainId)) {
      return { statusCode: 400, body: 'Invalid ChainID'}
    }
  }

  log(`Fetching pools from chain ${chainId}`)
  const pools = await fetchPoolsFromChain(chainId);

  try {
    log(`Updating Pools`)
    await updatePools(chainId, pools);
    log(`Saved pools`);
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    log(`Received db error: ${dbError}`);
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
