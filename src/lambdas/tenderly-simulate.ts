import fetch from 'isomorphic-fetch';
import { formatResponse } from './utils';

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const TENDERLY_ENDPOINT = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;

function isBodyValid(body: string | Record<string, string>): boolean {
  const _body: Record<string, string> =
    typeof body === 'object' ? body : JSON.parse(body);
  const bodyFieldsWhitelist = new Set([
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
  ]);
  const bodyKeys = Object.keys(_body);
  let isValid = true;

  bodyKeys.forEach(item => {
    if (!bodyFieldsWhitelist.has(item)) isValid = false;
  });

  return isValid;
}

export const handler = async ({ body }: any = {}): Promise<any> => {
  if (!body) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the request body'
    );
  }

  if (!isBodyValid(body)) {
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

    return formatResponse(200, JSON.stringify(result));
  } catch (e) {
    console.log(`Error when trying to simulate: ${e}`);
    return formatResponse(500, 'Unable to perform simulation');
  }
};
