import { getPools } from '../data-providers/dynamodb';
import { isValidNetworkId } from '../utils';

export const handler = async (event: any = {}): Promise<any> => {
  const networkId = parseInt(event.pathParameters.chainId);
  if (!networkId) {
    return { statusCode: 400, body: `Error: You are missing the networkId` };
  }
  if (!isValidNetworkId(networkId)) {
    return { statusCode: 404, body: `Error: Network ID ${networkId} does not exist`}
  } 

  const corsHeaders = {
    "Access-Control-Allow-Headers" : "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
  }

  try {
    const pools = await getPools(networkId);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(pools) };
  } catch (dbError) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify(dbError) };
  }
};
