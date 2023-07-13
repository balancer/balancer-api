import { captureException } from '@sentry/serverless';
import { wrapHandler } from '@/modules/sentry';
import {
  getSorSwap,
  SerializedSwapInfo,
  serializeSwapInfo,
} from '@/modules/sor';
import { isValidNetworkId } from '@/modules/network';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '@/constants/errors';
import { SwapInfo } from '@sobal/sdk';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidNetworkId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: 'invalid request, you are missing the parameter body',
    };
  }

  const useDb = !['0', 'false'].includes(event.queryStringParameters?.useDb);
  const minLiquidity = event.queryStringParameters?.minLiquidity;

  const sorRequest =
    typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  try {
    const swapInfo: SwapInfo = await getSorSwap(chainId, sorRequest, {
      useDb,
      minLiquidity,
    });
    const serializedSwapInfo: SerializedSwapInfo = serializeSwapInfo(swapInfo);
    return { statusCode: 200, body: JSON.stringify(serializedSwapInfo) };
  } catch (e) {
    console.log('Error: ', e);
    captureException(e, { extra: { chainId, sorRequest } });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SOR request failed' }),
    };
  }
});
