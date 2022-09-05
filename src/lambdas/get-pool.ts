import { getPool } from '../data-providers/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const networkId = parseInt(event.pathParameters.chainId);
  if (!networkId) {
    return { statusCode: 400, body: `Error: You are missing the networkId` };
  }

  const poolId = event.pathParameters.id;
  if (!poolId) {
    return { statusCode: 400, body: `Error: You are missing the pool id` };
  }

  try {
    const pool = await getPool(networkId, poolId);
    if (pool) {
      return { statusCode: 200, body: JSON.stringify(pool) };
    } else {
      return { statusCode: 404 };
    }
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
