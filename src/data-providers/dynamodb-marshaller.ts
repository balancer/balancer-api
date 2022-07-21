import { Pool } from '../types';
import { POOL_SCHEMA, MAX_DYNAMODB_PRECISION } from '../constants';
import { marshallItem } from '@aws/dynamodb-data-marshaller';
import { Marshaller} from '@aws/dynamodb-auto-marshaller';
import BigNumber from 'bignumber.js';


/** Modify item to ensure it meets DynamoDB specifications */
function sanitizeItem(marshalledItem) {
  // For numbers, trim to 38 decimals of precision
  const sanitizedItem = {...marshalledItem};
  if (sanitizedItem.N) {
    sanitizedItem.N = new BigNumber(marshalledItem.N).precision(MAX_DYNAMODB_PRECISION).toString();
  }

  return sanitizedItem;
}

/**
 * Adds types to all pool items for DynamoDB 
 * e.g. symbol: '50WBTC-50ETH' -> symbol: {'S': '50WBTC-50ETH'}
 *      decimals: 18 -> decimals: {'N': 18}
 * 
 * Required because some large numbers are strings in Javascript
 * but numbers in DynamoDB. 
 * e.g. totalLiquidity: '123.456' -> totalLiquidity: {'N': '123.456'}
*/
export function marshallPool(pool: Pool) {
  const autoMarshaller = new Marshaller();
  const autoMarshalledPool = autoMarshaller.marshallItem(pool);

  // These are JS strings that should be stored as numbers etc 
  const customPoolItems = marshallItem(POOL_SCHEMA as any, pool);
  const sanitizedCustomPoolItems = {};
  for (const key of Object.keys(POOL_SCHEMA)) {
    if (customPoolItems[key] && Object.keys(customPoolItems[key]).length > 0) { 
      sanitizedCustomPoolItems[key] = sanitizeItem(customPoolItems[key])
    }
  }
  return {...autoMarshalledPool, ...sanitizedCustomPoolItems};
}

/**
 * Turns a marshalled pool back into a normal Pool object
 */
export function unmarshallPool(dynamodbPool) {
  const autoMarshaller = new Marshaller();
  const unmarshalledPool = autoMarshaller.unmarshallItem(dynamodbPool);
  return unmarshalledPool;
}