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

export const handler = async ({ body, ...event }: any = {}): Promise<any> => {
  if (!body) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the request body'
    );
  }
  console.log({ body: body, event });
  try {
    const res = await fetch(TENDERLY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': Buffer.from(
          `${TENDERLY_ACCESS_KEY}:${TENDERLY_ACCESS_KEY}`
        ).toString('base64'),
      },
      body: typeof body == 'object' ? body : JSON.parse(body),
    });
    console.log({ res });
    const result = await res.json();
    console.log({ result });
    return formatResponse(200, result);
  } catch (e) {
    console.log(`Error when trying to simulate: ${e}`);
    return formatResponse(500, 'Unable to perform simulation');
  }
};
