/**
 * Script that runs on a schedule/webhook which pulls data from 
 * the graph / infura and pushes it into DynamoDB. 
 */

require("dotenv").config();
import { SOR } from "@balancer-labs/sor2";
import BigNumber from "bignumber.js";
import debug from "debug";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network, Order } from "./types";
import { updatePools } from "./dynamodb";

const log = debug("balancer");

const { MAX_POOLS, INFURA_PROJECT_ID } = process.env;

const nodeUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
const poolsSource = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
const chainId = Network.MAINNET;
const gasPrice = new BigNumber('30000000000');
let maxPools: number = 4;
if (MAX_POOLS)
  maxPools = Number(MAX_POOLS);


log(`Using Infura endpoint ${nodeUrl}`);
const provider: any = new JsonRpcProvider(nodeUrl);

const sor = new SOR(
  provider,
  gasPrice,
  maxPools,
  chainId,
  poolsSource
);

let lastBlockNumber = 0;

async function doWork() {
  log(`Working...`);
  const currentBlockNo = await provider.getBlockNumber();

  if(currentBlockNo !== lastBlockNumber){
    log(`New block ${currentBlockNo} found!`);
    log(`Fetching Pools`);
    await sor.fetchPools(true);
    log(`Saving pools to database`);
    const pools = sor.onChainBalanceCache.pools;
    await updatePools(pools);
    log(`Saved pools`);
    lastBlockNumber = currentBlockNo;
  }

  setTimeout(doWork, 500);
}


doWork();