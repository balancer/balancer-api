import { getTokens } from '../src/data-providers/dynamodb';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return { statusCode: 400, body: `Error: You are missing the chainId` };
  }

  try {
    const tokens = await getTokens(chainId);
    return { statusCode: 200, body: JSON.stringify(tokens) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
