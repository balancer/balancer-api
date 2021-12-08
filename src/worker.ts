/**
 * Script that runs on a schedule/webhook which pulls data from 
 * the graph / infura and pushes it into DynamoDB. 
 */

require("dotenv").config();
import debug from "debug";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network } from "./types";
import { fetchPoolsFromChain, getTokenPriceInNativeAsset } from "./sor";
import { getTokens, updatePools, updateToken } from "./dynamodb";
import { localAWSConfig, getInfuraUrl } from "./utils";

const log = debug("balancer");

const AWS = require("aws-sdk");
AWS.config.update(localAWSConfig);

const UPDATE_POOLS_INTERVAL = 500;
const UPDATE_PRICES_INTERVAL = 5000;

const lastBlockNumber = {} 

function doWork() {
  log(`Working...`);
  Object.values(Network).forEach(async (chainId) => {
    lastBlockNumber[chainId] = 0;
    fetchAndSavePools(chainId);
  });
  updateTokenPrices();
}

async function fetchAndSavePools(chainId: number) {
  const infuraUrl = getInfuraUrl(chainId);
  log(`Using Infura endpoint ${infuraUrl}`);
  const provider: any = new JsonRpcProvider(infuraUrl);
  const currentBlockNo = await provider.getBlockNumber();

  if(currentBlockNo !== lastBlockNumber[chainId]){
    log(`New block ${currentBlockNo} found on chain ${chainId}!`);
    log(`Fetching pools from chain ${chainId}`)
    const pools = await fetchPoolsFromChain(chainId);
    log(`Saving ${pools.length} pools for chain ${chainId} to database`);
    await updatePools(chainId, pools);
    log(`Saved pools`);
    lastBlockNumber[chainId] = currentBlockNo;
  }

  setTimeout(fetchAndSavePools.bind(null, chainId), UPDATE_POOLS_INTERVAL);
}

async function updateTokenPrices() {
  const tokens = await getTokens();
  console.log("Updating token prices");
  await Promise.all(tokens.map(async (token) => {
    const tokenPrice = await getTokenPriceInNativeAsset(token.chainId, token.address);
    token.price = tokenPrice;
    await updateToken(token);
    console.log(`Updated token ${token.symbol} to price ${token.price}`);
  }));
  console.log("Updated token prices");

  setTimeout(updateTokenPrices, UPDATE_PRICES_INTERVAL);
}


doWork();