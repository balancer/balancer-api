/**
 * Compare SOR results from Dev vs Prod to test SDK / SOR updates
 * 
 * This runs the example SOR requests from the README and ensures the dev
 * and prod endpoints return the same results.
 * 
 * This could be turned into an acceptance test in the future, 
 * but we need a shared staging / test account for the API first.
 * For now this should be run manually after each SDK / SOR update. 
 */
const axios = require('axios');
const util = require('util');
const { isEqual } = require('lodash');

const PROD_URL = 'https://api.balancer.fi/sor'
const DEV_URL = 'https://ayuyqhk7mh.execute-api.ap-southeast-2.amazonaws.com/prod/sor'

const SOR_REQUESTS = [{
    description: 'Swap BAL for DAI',
    network: 1,
    request: {"sellToken":"0xba100000625a3754423978a60c9317c58a424e3d","buyToken":"0x6b175474e89094c44da98b954eedeac495271d0f","orderKind":"sell", "amount":"1000000000000000000", "gasPrice":"10000000"}
  }, {
    description: 'Swap USDC for DAI',
    network: 1,
    request: {"sellToken":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","buyToken":"0x6b175474e89094c44da98b954eedeac495271d0f","orderKind":"sell", "amount":"100000", "gasPrice":"10000000"}
  }, {
    description: 'Swap WETH for an exact amount of BAL',
    network: 1,
    request: {"sellToken":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2","buyToken":"0xba100000625a3754423978a60c9317c58a424e3d","orderKind":"buy", "amount":"1000000000000000000", "gasPrice":"10000000"}
  }, {
    description: 'Swap BAL for DAI on the Polygon network',
    network: 137,
    request: {"sellToken":"0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3","buyToken":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","orderKind":"sell", "amount":"1000000000000000000", "gasPrice":"10000000"}
  }, {
    description: 'Swap WETH for BAL on the Arbitrum network',
    network: 42161,
    request: {"sellToken":"0x82af49447d8a07e3bd95bd0d56f35241523fbab1","buyToken":"0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8","orderKind":"sell", "amount":"1000000000000000000", "gasPrice":"10000000"}
  }
]

async function runTest() {
  for (const request of SOR_REQUESTS) {
    console.log(`Testing ${request.description}`);
    const results = await Promise.all([
      runRequest(DEV_URL, request.network, request.request),
      runRequest(PROD_URL, request.network, request.request),
    ]);

    if (!isEqual(results[0], results[1])) {
      console.error("Test failed!")
      console.error("DEV: ", results[0]);
      console.error("PROD: ", results[1]);
      process.exit(1);
    }
  }
}

async function runRequest(baseUrl, network, request) {
  const url = `${baseUrl}/${network}`;
  console.log("Url: ", url);
  let result;

  try {
    result = await axios.post(url, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error("Axios threw error: ", e.message);
    process.exit(1);
  }

  const { data } = result;
  if (data.errors) {
    throw new Error(
      `Encountered error running query: ${util.inspect(
        data.errors,
        false,
        null
      )}`
    );
  }

  return data.data;
}

runTest();