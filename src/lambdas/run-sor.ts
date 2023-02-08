import { captureException } from '@sentry/serverless';
import { wrapHandler } from '../plugins/sentry';
import { getSorSwap } from '../sor';
import { isValidChainId } from '../utils';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '../constants/errors';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidChainId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: 'invalid request, you are missing the parameter body',
    };
  }

  const useDb = !!event.queryStringParameters?.useDb;
  const minLiquidity = event.queryStringParameters?.minLiquidity;

  const sorRequest =
    typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  try {
    const swapInfo = await getSorSwap(chainId, sorRequest, { useDb, minLiquidity });
    return { statusCode: 200, body: JSON.stringify(swapInfo) };
  } catch (e) {
    captureException(e, { extra: { chainId, sorRequest }});
    return { statusCode: 500, body: JSON.stringify({ error: 'SOR request failed' }) };
  }
});
