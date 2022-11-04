import { getPool } from '../data-providers/dynamodb';
import { isValidChainId } from '../utils';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '../constants/errors';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidChainId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
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
