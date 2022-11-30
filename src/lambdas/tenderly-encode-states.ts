import fetch from 'isomorphic-fetch';
import { formatResponse, isBodyValid } from './utils';

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const TENDERLY_ENDPOINT = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/contracts/encode-states`;

export const handler = async ({ body }: any = {}): Promise<any> => {
  if (!body) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the request body'
    );
  }

  if (!isBodyValid(body, ['networkID', 'stateOverrides'])) {
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
    console.log(`Couldn't encode state overrides: ${e}`);
    return formatResponse(500, "Couldn't encode state overrides");
  }
};
