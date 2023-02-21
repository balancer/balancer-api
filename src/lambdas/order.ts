import { captureException } from '@sentry/serverless';
import { wrapHandler } from '@/modules/sentry';
import { isValidNetworkId } from '@/modules/network';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '@/constants/errors';
import { createSorOrder } from '@/modules/sor';


/** 
 * Fetch Balancer Order
 * Functions similarly to the /sor lambda but instead of returning SerializedSwapInfo 
 * it returns a transaction that can be posted directly to the chain. 
 */

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
      body: 'invalid request, you are missing the request body',
    };
  }

  const sorRequest =
    typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  try {
    const sorOrder = await createSorOrder(chainId, sorRequest);
    return { statusCode: 200, body: JSON.stringify(sorOrder) };
  } catch (e) {
    captureException(e, { extra: { chainId, sorRequest }});
    return { statusCode: 500, body: JSON.stringify({ error: 'SOR request failed' }) };
  }
});
