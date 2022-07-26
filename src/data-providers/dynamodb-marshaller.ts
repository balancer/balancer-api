import { Pool, Schema } from '../types';
import { POOL_SCHEMA, MAX_DYNAMODB_PRECISION } from '../constants';
import { Marshaller, NumberValue} from '@aws/dynamodb-auto-marshaller';
import BigNumber from 'bignumber.js';
import { AttributeMap } from 'aws-sdk/clients/dynamodb';

/** Modify item to ensure it meets DynamoDB specifications */
function sanitizeField(marshalledItem) {
  // For numbers, trim to 38 decimals of precision
  const sanitizedItem = {...marshalledItem};
  if (sanitizedItem.N) {
    sanitizedItem.N = new BigNumber(marshalledItem.N).precision(MAX_DYNAMODB_PRECISION).toString();
  }

  return sanitizedItem;
}

function marshallItem(schema: Schema, item) {
  const marshalledItem = {};
  Object.entries(schema).forEach(([key, keySchema]) => {
    if (item[key]) {
      switch (keySchema.type) {
        case 'BigNumber':
          marshalledItem[key] = {'N': item[key]};
          break;
        case 'Boolean':
          marshalledItem[key] = {'BOOL': item[key]};
          break;
        case 'Number':
          marshalledItem[key] = {'N': item[key]};
          break;
        case 'String':
          marshalledItem[key] = {'S': item[key]}
      }
    }
  });
  return marshalledItem;
}

/** 
 *  Does the final touches to convert a DynamoDB object back into a regular object
 *  Converts NumberValue fields into regular strings/number
 *  - Items specified as BigDecimal are converted to strings
 *  - All others are converted to numbers
 */
function finalizeUnmarshalledItem(schema: Schema, item) {
  const unmarshalledItem = {};
  if (Array.isArray(item)) {
    return item.map((value) => finalizeUnmarshalledItem({}, value));
  }
  if (!item || typeof item !== "object") {
    return item;
  }
  Object.entries(item).forEach(([key, value]) => {
    if (value instanceof NumberValue) {
      if (schema[key]) {
        switch (schema[key].type) {
          case 'BigNumber':
            unmarshalledItem[key] = value.value
          break;
          case 'Number':
          default:
            unmarshalledItem[key] = Number(value.value)
          break;
        }
      } else {
        unmarshalledItem[key] = Number(value.value);
      }
      return;
    }

    if (Array.isArray(value)) {
      unmarshalledItem[key] = finalizeUnmarshalledItem({}, value);
      return
    }

    if (typeof value === "object") {
      unmarshalledItem[key] = finalizeUnmarshalledItem({}, value);
      return;
    } 

    // If it's not a NumberValue, Array or Object it's a plain value, 
    // so just set it on the new object. 
    unmarshalledItem[key] = value;
  })
  return unmarshalledItem;
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
  const customPoolItems = marshallItem(POOL_SCHEMA, pool);
  const sanitizedCustomPoolItems = {};
  for (const key of Object.keys(POOL_SCHEMA)) {
    if (customPoolItems[key] && Object.keys(customPoolItems[key]).length > 0) { 
      sanitizedCustomPoolItems[key] = sanitizeField(customPoolItems[key])
    }
  }
  return {...autoMarshalledPool, ...sanitizedCustomPoolItems};
}

/**
 * Turns a marshalled pool back into a normal Pool object
 * 
 * The automarshaller turns numbers into NumberObjects so the finalizeUnmarshallItem
 * is needed to convert them into either numbers or strings based on the schema. 
 */
export function unmarshallPool(dynamodbPool: AttributeMap): Pool {
  const autoMarshaller = new Marshaller();
  const autoUnMarshalledPool = autoMarshaller.unmarshallItem(dynamodbPool);
  const unmarshalledPool = finalizeUnmarshalledItem(POOL_SCHEMA, autoUnMarshalledPool);
  return unmarshalledPool as any;
}