import fetch from 'isomorphic-fetch';

const SANCTIONS_ENDPOINT = 'https://api.trmlabs.com/public/v1/sanctions/screening';

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }

  const request = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  const sanctionChecks = Array.isArray(request) ? request : [request];

  for (const check of sanctionChecks) {
    const address = check.address;
    if (!address) {
      return { statusCode: 400, body: `Error: You are missing the address in one of your sanction checks` };
    }
  }

  try {
    const response = await fetch(SANCTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sanctionChecks)
    });

    const result = await response.json();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    console.log(`Received error performing sanctions check on addresses ${sanctionChecks}: ${e}`)
    return { statusCode: 500, body: '' };
  }
};
