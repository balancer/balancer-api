/**
 * Script that runs on a schedule/webhook which pulls data from 
 * the graph / infura and pushes it into DynamoDB. 
 */

require("dotenv").config();
import debug from "debug";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network } from "./types";
import { fetchPoolsFromChain } from "./sor";
import { updatePools } from "./dynamodb";
import { localAWSConfig, getInfuraUrl } from "./utils";

const log = debug("balancer");

const AWS = require("aws-sdk");
AWS.config.update(localAWSConfig);


const lastBlockNumber = {} 

function doWork() {
  log(`Working...`);
  Object.values(Network).forEach(async (chainId) => {
    lastBlockNumber[chainId] = 0;
    fetchAndSavePools(chainId);
  });
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

  setTimeout(fetchAndSavePools.bind(null, chainId), 500);
}


doWork();