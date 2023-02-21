require('dotenv').config();
import apiBenchmark from 'api-benchmark';
import { SorRequest } from '../types';
import { TOKENS, Network, TokenWithSlot } from '../constants';
import { parseFixed } from '@ethersproject/bignumber';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';
const NETWORK = 1;

const { DAI, BAL, USDC, WETH, waUSDC, waUSDT } = TOKENS[Network.MAINNET];

const GAS_PRICE = parseFixed('50', 9).toString();

interface SorPayload {
  name: string,
  payload: SorRequest
}

function createSorPayload(sellToken: TokenWithSlot, buyToken: TokenWithSlot): SorPayload {
  return {
    name: `${sellToken.symbol} -> ${buyToken.symbol}`,
    payload: {
      sellToken: sellToken.address,
      buyToken: buyToken.address,
      orderKind: 'sell',
      amount: parseFixed('100', sellToken.decimals).toString(),
      gasPrice: GAS_PRICE,
    }
  }
}


const sorPayloads: SorPayload[] = [
  createSorPayload(BAL, DAI),
  createSorPayload(USDC, DAI),
  createSorPayload(WETH, BAL),
  createSorPayload(waUSDC, WETH),
  createSorPayload(waUSDT, USDC),
];


function createRoute(minLiquidity: number, payload: SorRequest) {
  return {
    method: 'post',
    route: `?useDb=1&minLiquidity=${minLiquidity}`,
    data: payload,
  };
}

function createRoutes(minLiquidity: number) {
  return Object.fromEntries(sorPayloads.map((payload) => {
    const key = `${payload.name} >$${minLiquidity}`;
    return [key, createRoute(minLiquidity, payload.payload)];
  }));
}


const service = {
  api: `${ENDPOINT_URL}/sor/${NETWORK}/`,
};

const routes = { 
  ...createRoutes(0.001),
  ...createRoutes(0.01),
  ...createRoutes(0.1),
  ...createRoutes(1),
  ...createRoutes(10),
  ...createRoutes(100),
  ...createRoutes(1000),
  ...createRoutes(10000),
  ...createRoutes(100000),
};

const options = {
  debug: true,
  stopOnError: true,
  minSamples: 20
};



apiBenchmark.compare(service, routes, options, async (err, results) => {
  console.log("\nResults");

  const resultsTable = {};
  Object.values(results.api).forEach((result: any) => {
    const name = result.name.replace(/^api\//, '');
    const tokenSymbols = name.match(/^[a-zA-Z]+ -> [a-zA-Z]+/)[0];
    const minLiquidity = name.match(/\$[0-9.]+/)[0];
    resultsTable[minLiquidity] = resultsTable[minLiquidity] || {};
    const responseTime = Math.round(result.stats.mean * 1000); 
    resultsTable[minLiquidity][tokenSymbols] = `${responseTime}ms`;
  });

  console.table(resultsTable);

  console.log("\nSpot prices");
  const spotPricesTable = {};
  // Print market spot price for each min liquidity
  Object.values(results.api).forEach((result: any) => {
    const name = result.name.replace(/^api\//, '');
    const tokenSymbols = name.match(/^[a-zA-Z]+ -> [a-zA-Z]+/)[0];
    const minLiquidity = name.match(/\$[0-9.]+/)[0];
    spotPricesTable[minLiquidity] = spotPricesTable[minLiquidity] || {};
    const body = JSON.parse(result.response.body);
    const spotPrice = body.marketSp; 
    spotPricesTable[minLiquidity][tokenSymbols] = spotPrice;
  });

  console.table(spotPricesTable)
});
