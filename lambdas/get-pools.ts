import { getPools } from '../src/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return { statusCode: 400, body: `Error: You are missing the chainId` };
  }

  const corsHeaders = {
    "Access-Control-Allow-Headers" : "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
  }

  try {
    const pools = await getPools(chainId);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(pools) };
  } catch (dbError) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify(dbError) };
  }
};
