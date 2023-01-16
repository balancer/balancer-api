import { captureException } from '@sentry/serverless';
import { wrapHandler } from '../plugins/sentry';
import { getPool } from '../data-providers/dynamodb';
import { isValidChainId } from '../utils';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '../constants/errors';
import { formatResponse } from './utils';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
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
      return formatResponse(200, JSON.stringify(pool));
    } else {
      return formatResponse(404);
    }
  } catch (e) {
    captureException(e);
    return formatResponse(500, 'Internal DB Error');
  }
});
