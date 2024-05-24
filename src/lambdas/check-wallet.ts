import { wrapHandler } from '@/modules/sentry';
import { captureException } from '@sentry/serverless';
import fetch from 'isomorphic-fetch';
import { formatResponse } from './utils';

const { HYPERNATIVE_EMAIL, HYPERNATIVE_PASSWORD } = process.env;

type ReputationResponse = {
  data: Array<{ flags: string[]; address: string; recommendation: string }>;
};

async function getAuthKey(): Promise<string | null> {
  try {
    const res = await fetch('https://api.hypernative.xyz/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: HYPERNATIVE_EMAIL || '',
        password: HYPERNATIVE_PASSWORD || '',
      }),
    });
    const {
      data: { token },
    } = await res.json();

    return token;
  } catch (err) {
    captureException(err);
    return null;
  }
}

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  const address = event.queryStringParameters.address;
  if (!address) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the wallet address'
    );
  }

  const apiKey = await getAuthKey();
  if (!apiKey) return formatResponse(500, 'Unable to perform sanctions check');

  try {
    const response = await fetch(
      'https://api.hypernative.xyz/assets/reputation/addresses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          addresses: [address],
          // https://docs.hypernative.xyz/hypernative-product-docs/hypernative-api/hypernative-screener-address-reputation/reputation-flags
          flagIds: ['F-1101', 'F-1111', 'F-1301', 'F-1302'],
          expandDetails: true,
        }),
      }
    );

    const {
      data: [check],
    }: ReputationResponse = await response.json();

    const isBlocked = check.recommendation === 'Deny';

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
    captureException(e, { extra: { address } });
    return formatResponse(500, 'Unable to perform sanctions check');
  }
});
