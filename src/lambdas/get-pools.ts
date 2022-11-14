import { getPools } from '../data-providers/dynamodb';
import { isValidChainId } from '../utils';
import {
  INVALID_CHAIN_ID_ERROR,
  MISSING_CHAIN_ID_ERROR,
} from '../constants/errors';

export const handler = async (event: any = {}): Promise<any> => {
  const chainId = parseInt(event.pathParameters.chainId);
  if (!chainId) {
    return MISSING_CHAIN_ID_ERROR;
  }
  if (!isValidChainId(chainId)) {
    return INVALID_CHAIN_ID_ERROR;
  }

  const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
  };

  try {
    const pools = await getPools(chainId);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(pools),
    };
  } catch (dbError) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(dbError),
    };
  }
};
