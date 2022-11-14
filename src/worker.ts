/**
 * Script that runs on a schedule/webhook which pulls data from
 * the graph / infura and pushes it into DynamoDB.
 */

require('dotenv').config();
import debug from 'debug';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network } from './constants';
import {
  fetchPoolsFromChain,
  fetchTokens,
  removeKnownTokens,
  sanitizePools,
} from './data-providers/onchain';
import {
  getPools,
  getTokens,
  isAlive,
  updatePools,
  updateTokens,
} from './data-providers/dynamodb';
import {
  localAWSConfig,
  getInfuraUrl,
  getTokenAddressesFromPools,
} from './utils';
import { updateTokenPrices } from './tokens';
import { PoolDecorator } from './pools/pool.decorator';
import { exit } from 'process';

const log = debug('balancer:worker');

const AWS = require('aws-sdk');
AWS.config.update(localAWSConfig);

const UPDATE_POOLS_INTERVAL = 500;
const UPDATE_PRICES_INTERVAL = 60 * 1000;

const lastBlockNumber = {};

async function doWork() {
  log(`Working...`);
  const isDynamoDBAlive = await isAlive();
  if (!isDynamoDBAlive) {
    console.error(
      'Could not connect to DynamoDB. Please start it first before running worker'
    );
    exit(1);
  }
  Object.values(Network).forEach(async chainId => {
    lastBlockNumber[chainId] = 0;
    fetchAndSavePools(chainId);
    if (chainId !== Network.KOVAN) {
      decorateAndSavePools(chainId);
    }
  });
  updatePrices();
}

async function fetchAndSavePools(chainId: number) {
  const infuraUrl = getInfuraUrl(chainId);
  log(`Using Infura endpoint ${infuraUrl}`);
  const provider: any = new JsonRpcProvider(infuraUrl);
  const currentBlockNo = await provider.getBlockNumber();

  if (currentBlockNo !== lastBlockNumber[chainId]) {
    log(`New block ${currentBlockNo} found on chain ${chainId}!`);
    log(`Fetching pools from chain ${chainId}`);
    const poolsFromChain = await fetchPoolsFromChain(chainId);
    log(`Sanitizing ${poolsFromChain.length} pools`);
    const pools = sanitizePools(poolsFromChain);
    log(`Saving ${pools.length} pools for chain ${chainId} to database`);
    await updatePools(pools);
    log(`Saved pools. Fetching Tokens for pools`);
    const tokenAddresses = getTokenAddressesFromPools(pools);
    log(
      `Found ${tokenAddresses.length} tokens in pools on chain ${chainId}. Filtering by known tokens`
    );
    const filteredTokenAddresses = await removeKnownTokens(
      chainId,
      tokenAddresses
    );
    log(
      `Fetching ${filteredTokenAddresses.length} tokens for chain ${chainId}`
    );
    const tokens = await fetchTokens(chainId, filteredTokenAddresses);
    await updateTokens(tokens);
    log(`Saved ${filteredTokenAddresses.length} Tokens`);
    lastBlockNumber[chainId] = currentBlockNo;
  }

  setTimeout(fetchAndSavePools.bind(null, chainId), UPDATE_POOLS_INTERVAL);
}

async function decorateAndSavePools(chainId: number) {
  log(`Decorating and saving pools for chain ${chainId}`);
  const tokens = await getTokens();
  log(`loaded ${tokens.length} tokens`);
  const pools = await getPools(chainId);
  log(`loaded ${pools.length} pools`);
  const poolDecorator = new PoolDecorator(pools);
  const decoratedPools = await poolDecorator.decorate(tokens);
  log(`Got ${decoratedPools.length} decorated pools`);
  await updatePools(decoratedPools);
  log(`Saved decorated pools`);
  setTimeout(decorateAndSavePools.bind(null, chainId), UPDATE_POOLS_INTERVAL);
}

async function updatePrices() {
  const tokens = await getTokens();
  log('Updating token prices');
  await updateTokenPrices(tokens, false);
  log('Updated token prices');
  setTimeout(updatePrices, UPDATE_PRICES_INTERVAL);
}

doWork();
