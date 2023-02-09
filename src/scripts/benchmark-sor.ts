require('dotenv').config();
import apiBenchmark from 'api-benchmark';
import { SorRequest } from '../types';
import { TOKENS, Network, TokenWithSlot } from '../constants';
import { parseFixed } from '@ethersproject/bignumber';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';
const NETWORK = 1;

const { DAI, BAL, USDC, WETH, auraBal } = TOKENS[Network.MAINNET];

const GAS_PRICE = parseFixed('50', 9).toString();


function createSorPayload(sellToken: TokenWithSlot, buyToken: TokenWithSlot): SorRequest {
  return {
    sellToken: sellToken.address,
    buyToken: buyToken.address,
    orderKind: 'sell',
    amount: parseFixed('100', sellToken.decimals).toString(),
    gasPrice: GAS_PRICE,
  }
}


const sorPayloads: SorRequest[] = [
  createSorPayload(BAL, DAI),
  createSorPayload(USDC, DAI),
  createSorPayload(WETH, BAL),
  createSorPayload(WETH, auraBal),
];


function createRoute(minLiquidity: number, payload: SorRequest) {
  return {
    method: 'post',
    route: `?useDb=1&minLiquidity=${minLiquidity}`,
    data: payload,
  };
}

function createSubgraphRoutes() {
  return Object.fromEntries(sorPayloads.map((payload, idx) => {
    const key = `subgraph-${idx}`;
    return [key, {
      method: 'post',
      route: '',
      data: payload
    }];
  }));
}


function createRoutes(minLiquidity: number) {
  return Object.fromEntries(sorPayloads.map((payload, idx) => {
    const key = `${minLiquidity}-${idx}`;
    return [key, createRoute(minLiquidity, payload)];
  }));
}


const service = {
  api: `${ENDPOINT_URL}/sor/${NETWORK}/`,
};

const routes = { 
  ...createSubgraphRoutes(),
  ...createRoutes(0.001),
  ...createRoutes(0.01),
  ...createRoutes(0.1),
  ...createRoutes(1),
  ...createRoutes(10),
  ...createRoutes(100),
  ...createRoutes(1000),
};

const options = {
  debug: true,
  stopOnError: true,
  minSamples: 5
};



apiBenchmark.compare(service, routes, options, async (err, results) => {
  console.log("Spot prices");
  // Print market spot price for each min liquidity
  Object.values(results.api).forEach((result: any) => {
    const name = result.name;
    const body = JSON.parse(result.response.body);
    const spotPrice = body.marketSp; 
    console.log(`${name}: ${spotPrice}`);
  });
});
