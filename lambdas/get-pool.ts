import { getPool } from '../src/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const poolId = event.pathParameters.id;
  if (!poolId) {
    return { statusCode: 400, body: `Error: You are missing the path parameter id` };
  }

  try {
    const pool = await getPool(poolId);
    if (pool) {
      return { statusCode: 200, body: JSON.stringify(pool) };
    } else {
      return { statusCode: 404 };
    }
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
