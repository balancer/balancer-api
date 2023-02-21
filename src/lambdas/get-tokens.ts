import { captureException } from '@sentry/serverless';
import { wrapHandler } from '@/modules/sentry';
import { getTokens } from '@/modules/dynamodb/dynamodb';
import { isValidNetworkId } from '@/modules/network';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '@/constants/errors';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidNetworkId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  try {
    const tokens = await getTokens(chainId);
    return { statusCode: 200, body: JSON.stringify(tokens) };
  } catch (e) {
    captureException(e);
    return { statusCode: 500, body: 'Internal DB Error'};
  }
});
