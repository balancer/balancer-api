import { AprBreakdown, SubgraphPoolBase } from '@balancer-labs/sdk';
import { Pool } from './types';
import { Schema, POOL_SCHEMA, POOL_TOKEN_SCHEMA } from '@/modules/dynamodb';
import _ from 'lodash';
import { inspect } from 'util';
import { BigNumber } from 'bignumber.js';


/**
 * Used for converting a Balancer Pool type to a SubgraphPoolBase type which is what SOR expects
 *
 * Some parameters are optional in a Balancer Pool but required in SubgraphPoolBase so default values or null are set for them
 */
export function convertPoolToSubgraphPoolBase(pool: Pool): SubgraphPoolBase {
  const tokens = pool.tokens.map(poolToken => {
    return {
      ...poolToken,
      decimals: poolToken.decimals || 18,
      priceRate: poolToken.priceRate || null,
      weight: poolToken.weight || null,
    };
  });
  return {
    ...pool,
    tokens,
  };
}



export function isValidApr(apr: AprBreakdown) {
  for (const value of Object.values(apr)) {
    if (typeof value === 'object') {
      if (!isValidApr(value)) return false;
    } else {
      if (isNaN(value)) return false;
      if (!isFinite(value)) return false;
    }
  }

  return true;
}


/**
 * Takes a list of currentPools and newPools and returns a list
 * of all pools that have changed in newPools
 */

export function getChangedPools(newPools: Partial<Pool>[], currentPools: Pool[]) {
  const currentPoolsMap = Object.fromEntries(
    currentPools.map(pool => {
      return [pool.id, pool];
    })
  );

  return newPools.filter(pool => {
    return !isSame(pool, currentPoolsMap[pool.id]);
  });
}

export function getNonStaticSchemaFields(schema: Schema): string[] {
  const nonStaticFields = Object.entries(schema).map(([name, details]) => {
    if (details.static) {
      return null;
    }
    return name;
  });
  return _.compact(nonStaticFields);
}

export function isSchemaFieldANumber(key: string, schema: Schema): boolean {
  const numberTypes = ['BigDecimal', 'BigInt', 'Int'];
  return numberTypes.includes(schema[key]?.type)
}

export function isSame(newPool: Partial<Pool>, oldPool?: Pool): boolean {
  if (!oldPool) return false;

  const poolFieldsToCompare = getNonStaticSchemaFields(POOL_SCHEMA);
  const tokenFieldsToCompare = getNonStaticSchemaFields(POOL_TOKEN_SCHEMA);

  const filteredOldPool = _.pick(oldPool, poolFieldsToCompare);
  filteredOldPool.tokens = oldPool.tokens.map(token =>
    _.pick(token, tokenFieldsToCompare)
  );
  const filteredNewPool = _.pick(newPool, poolFieldsToCompare);
  filteredNewPool.tokens = newPool.tokens.map(token =>
    _.pick(token, tokenFieldsToCompare)
  );

  const newPoolFields = Object.keys(filteredNewPool);

  for (const key of newPoolFields) {
    if (!_.isEqual(filteredNewPool[key], filteredOldPool[key])) {
      if (isSchemaFieldANumber(key, POOL_SCHEMA) && new BigNumber(filteredNewPool[key]).eq(filteredOldPool[key])) {
        continue;
      }

      console.log(
        `Updating pool ${newPool.id} -  ${key} is not equal. New: ${inspect(
          filteredNewPool[key],
          false,
          null
        )} Old: ${inspect(filteredOldPool[key], false, null)}`
      );
      return false;
    }
  }
  return true;
}


export function getTokenAddressesFromPools(pools: Partial<Pool>[]): string[] {
  const tokenAddressMap = {};
  pools.forEach(pool => {
    pool.tokensList.forEach(address => {
      tokenAddressMap[address] = true;
    });
  });
  return Object.keys(tokenAddressMap);
}

export function convertPoolIdToAddress(poolId: string) {
  return poolId.substring(0, 42);
}