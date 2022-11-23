import fetch from 'isomorphic-fetch';

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const TENDERLY_ENDPOINT = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;

function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body,
  };
}

export const handler = async ({ body }: any = {}): Promise<any> => {
  if (!body) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the request body'
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
    console.log({ res });
    const result = await res.json();
    console.log({ result });
    return formatResponse(200, JSON.stringify(result));
  } catch (e) {
    console.log(`Error when trying to simulate: ${e}`);
    return formatResponse(500, 'Unable to perform simulation');
  }
};
