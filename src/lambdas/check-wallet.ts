import fetch from 'isomorphic-fetch';
import { TRMAccountDetails, TRMEntity, TRMRiskIndicator } from '../types';

const SANCTIONS_ENDPOINT =
  'https://api.trmlabs.com/public/v2/screening/addresses';
const { SANCTIONS_API_KEY } = process.env;

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

export const handler = async (event: any = {}): Promise<any> => {
  const address = event.pathParameters.address;
  if (!address) {
    return formatResponse(
      400,
      'Error: invalid request, you are missing the wallet address'
    );
  }

  try {
    const response = await fetch(SANCTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(`${SANCTIONS_API_KEY}:${SANCTIONS_API_KEY}`).toString(
            'base64'
          ),
      },
      body: JSON.stringify([
        {
          address: address.toLowerCase(),
          chain: 'ethereum',
        },
      ]),
    });

    const result: TRMAccountDetails[] = await response.json();

    const riskIndicators: TRMRiskIndicator[] =
      result[0]?.addressRiskIndicators || [];
    const entities: TRMEntity[] = result[0]?.entities || [];

    const hasSevereRisk = riskIndicators.some(
      indicator => indicator.categoryRiskScoreLevelLabel === 'Severe'
    );
    const hasSevereEntity = entities.some(
      entity => entity.riskScoreLevelLabel === 'Severe'
    );

    const isBlocked = hasSevereEntity || hasSevereRisk;

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
    return formatResponse(500, 'Unable to perform sanctions check');
  }
};
