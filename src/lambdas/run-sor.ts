import { getSorSwap } from "../sor";

export const handler = async (event: any = {}): Promise<any> => {
  const networkId = parseInt(event.pathParameters.chainId);
  if (!networkId) {
    return { statusCode: 400, body: `Error: You are missing the networkId` };
  }

  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }
  const sorRequest = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  try {
    const swapInfo = await getSorSwap(networkId, sorRequest);
    return { statusCode: 200, body: JSON.stringify(swapInfo) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};