/**
 * Script that runs on a schedule/webhook which pulls data from 
 * the graph / infura and pushes it into DynamoDB. 
 */

require("dotenv").config();
import BigNumber from "bignumber.js";
import debug from "debug";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network } from "./types";
import { fetchPoolsFromChain } from "./sor";
import { updatePools } from "./dynamodb";

const log = debug("balancer");

const { INFURA_PROJECT_ID } = process.env;

const nodeUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

log(`Using Infura endpoint ${nodeUrl}`);
const provider: any = new JsonRpcProvider(nodeUrl);

let lastBlockNumber = 0;

async function doWork() {
  log(`Working...`);
  const currentBlockNo = await provider.getBlockNumber();

  if(currentBlockNo !== lastBlockNumber){
    log(`New block ${currentBlockNo} found!`);
    log(`Fetching pools from chain`)
    const pools = await fetchPoolsFromChain();
    log(`Saving ${pools.length} pools to database`);
    await updatePools(pools);
    log(`Saved pools`);
    lastBlockNumber = currentBlockNo;
  }

  setTimeout(doWork, 500);
}


doWork();