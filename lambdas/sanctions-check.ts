import fetch from 'isomorphic-fetch';

const SANCTIONS_ENDPOINT = 'https://api.trmlabs.com/public/v1/sanctions/screening';

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }

  const address = event.body.address;
  if (!address) {
    return { statusCode: 400, body: `Error: You are missing the address in the body` };
  }

  const response = await fetch(SANCTIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      {
        address: address.toLowerCase()
      }
    ])
  });

  return { statusCode: 200, body: response.json() };
};
