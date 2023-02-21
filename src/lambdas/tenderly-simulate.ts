import { captureException } from '@sentry/serverless';
import { wrapHandler } from '../modules/sentry/sentry';
import fetch from 'isomorphic-fetch';
import { formatResponse, isBodyValid } from './utils';

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const TENDERLY_ENDPOINT = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;

export const handler = wrapHandler(async ({ body }: any = {}): Promise<any> => {
  if (!body) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the request body'
    );
  }

  if (
    !isBodyValid(body, [
      'state_objects',
      'to',
      'network_id',
      'from',
      'to',
      'input',
      'gas',
      'gas_price',
      'value',
      'save_if_fails',
      'save',
      'simulation_type',
      'block_number',
    ])
  ) {
    return formatResponse(
      400,
      `Error: invalid request, prohibited field in the request body`
    );
  }

  try {
    const res = await fetch(TENDERLY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': TENDERLY_ACCESS_KEY,
      },
      body: typeof body == 'string' ? body : JSON.stringify(body),
    });

    const result = await res.json();

    return formatResponse(
      200,
      JSON.stringify({
        transaction: {
          transaction_info: {
            call_trace: {
              output: result.transaction.transaction_info.call_trace.output,
            },
          },
        },
      })
    );
  } catch (e) {
    captureException(e);
    console.log(`Error when trying to simulate: ${e}`);
    return formatResponse(500, 'Unable to perform simulation');
  }
});
