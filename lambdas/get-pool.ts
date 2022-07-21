import { getPool } from '../src/data-providers/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return { statusCode: 400, body: `Error: You are missing the chainId` };
  }

  const poolId = event.pathParameters.id;
  if (!poolId) {
    return { statusCode: 400, body: `Error: You are missing the pool id` };
  }

  try {
    const pool = await getPool(chainId, poolId);
    if (pool) {
      return { statusCode: 200, body: JSON.stringify(pool) };
    } else {
      return { statusCode: 404 };
    }
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
