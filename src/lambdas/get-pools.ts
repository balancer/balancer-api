import { captureException } from '@sentry/serverless';
import { wrapHandler } from '@/modules/sentry';
import { getPools } from '@/modules/dynamodb';
import { isValidNetworkId } from '@/modules/network';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '@/constants/errors';
import { formatResponse } from './utils';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidNetworkId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  try {
    const pools = await getPools(chainId);
    return formatResponse(200, JSON.stringify(pools));
  } catch (e) {
    captureException(e);
    return formatResponse(500, 'Internal DB Error');
  }
});
