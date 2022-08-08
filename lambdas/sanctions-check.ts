import fetch from 'isomorphic-fetch';

const SANCTIONS_ENDPOINT = 'https://api.trmlabs.com/public/v1/sanctions/screening';
const { SANCTIONS_API_KEY } = process.env;

function formatResponse(statusCode, body) {
  return { 
    statusCode, 
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Headers" : "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST"
    },
    body
  };
}

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return formatResponse(400, 'Error: invalid request, you are missing the request body');
  }

  const request = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  const sanctionChecks = Array.isArray(request) ? request : [request];

  for (const check of sanctionChecks) {
    const address = check.address;
    if (!address) {
      return formatResponse(400, 'Error: You are missing the address in one of your sanction checks');
    }
  }

  try {
    const response = await fetch(SANCTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${SANCTIONS_API_KEY}:${SANCTIONS_API_KEY}`).toString('base64')
      },
      body: JSON.stringify(sanctionChecks)
    });

    const result = await response.json();
    return formatResponse(200, JSON.stringify(result));
   
  } catch (e) {
    console.log(`Received error performing sanctions check on addresses ${sanctionChecks}: ${e}`)
    return formatResponse(500, 'Unable to perform sanctions check');
  }
};
