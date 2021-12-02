import { getPools } from '../src/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return { statusCode: 400, body: `Error: You are missing the chainId` };
  }

  try {
    const pools = await getPools(chainId);
    return { statusCode: 200, body: JSON.stringify(pools) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
