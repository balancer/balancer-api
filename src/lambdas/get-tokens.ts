import { getTokens } from '../data-providers/dynamodb';
import { isValidChainId } from '../utils';
import { INVALID_CHAIN_ID_ERROR, MISSING_CHAIN_ID_ERROR } from '../constants/errors';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidChainId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  } 

  try {
    const tokens = await getTokens(chainId);
    return { statusCode: 200, body: JSON.stringify(tokens) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
