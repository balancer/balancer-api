import { wrapHandler } from '@/modules/sentry';
import { captureException } from '@sentry/serverless';
import { formatResponse } from './utils';
import { MISSING_CHAIN_ID_ERROR } from '@/constants';
import { Chainalysis } from '@/modules/sanctions';

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }

  const address = event.queryStringParameters.address;
  if (!address) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the wallet address'
    );
  }

  try {
    const chainalysis = new Chainalysis(chainId);
    const isBlocked = await chainalysis.isSanctioned(address);

    return formatResponse(
      200,
      JSON.stringify({
        is_blocked: isBlocked,
      })
    );
  } catch (e) {
    console.log(
      `Received error performing wallet check on address ${address}: ${e}`
    );
    captureException(e, { extra: { address } })
    return formatResponse(500, 'Unable to perform sanctions check');
  }
});
