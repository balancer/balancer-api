import { getPools } from '../data-providers/dynamodb';
import { isValidChainId } from '../utils';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '../constants/errors';
import { formatResponse } from './utils';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidChainId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  try {
    const pools = await getPools(chainId);
    return formatResponse(200, JSON.stringify(pools));
  } catch (dbError) {
    return formatResponse(500, 'Internal DB Error');
  }
};
