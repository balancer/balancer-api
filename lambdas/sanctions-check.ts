import fetch from 'isomorphic-fetch';

const SANCTIONS_ENDPOINT = 'https://api.trmlabs.com/public/v1/sanctions/screening';

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }

  const request = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  const address = request.address;
  if (!address) {
    return { statusCode: 400, body: `Error: You are missing the address in the body` };
  }

  console.log("Posting addres: ", address, " to endpoint: ", SANCTIONS_ENDPOINT);
  try {
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

    const result = await response.json();
    console.log("Got result: ", result);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    console.log(`Received error performing sanctions check: ${e}`)
    return { statusCode: 500, body: '' };
  }
};
