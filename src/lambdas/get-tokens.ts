import { getTokens } from '../data-providers/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const networkId = parseInt(event.pathParameters.networkId);
  if (!networkId) {
    return { statusCode: 400, body: `Error: You are missing the networkId` };
  }

  try {
    const tokens = await getTokens(networkId);
    return { statusCode: 200, body: JSON.stringify(tokens) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
