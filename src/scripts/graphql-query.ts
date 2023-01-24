const axios = require('axios');
const util = require('util');
require('dotenv').config();

const { ENDPOINT_URL } = process.env;
console.log(ENDPOINT_URL);
if (!ENDPOINT_URL) {
  console.error(
    'You need to set the env variable ENDPOINT_URL before running this script'
  );
  process.exit(1);
}

const simpleQuery = `query {
    pools (
      first: 10
      chainId: 1
    ) {
      pools {
        id
        address
        poolType
        tokens { 
          address 
          symbol 
          balance 
        } 
      }
      nextToken
    }
  }`;

const complexQuery = `query { 
  pools (
    chainId: 1, 
    first: 10, 
    orderBy: "totalLiquidity", 
    orderDirection: "desc", 
    where: {
      tokensList: {
        contains: []
      }, 
      poolType: {
        not_in: ["Element", "AaveLinear", "Linear", "ERC4626Linear", "FX"]
      }, 
      totalShares: {
        gt: 0.01
      }, 
      id: {
        not_in: [""]
      }
    }) {
      pools { 
        id 
        address 
        poolType 
        swapFee 
        tokensList 
        totalLiquidity 
        totalSwapVolume 
        totalSwapFee 
        totalShares 
        volumeSnapshot
        feesSnapshot
        owner 
        factory 
        amp 
        createTime 
        swapEnabled 
        tokens { 
          address 
          balance 
          weight 
          priceRate 
          symbol 
        } 
        apr {
          stakingApr {
            min
            max
          }
          swapFees
          tokenAprs {
            total
            breakdown
          }
          rewardAprs {
            total
            breakdown
          }
          protocolApr
          min
          max
        }
      } 
      nextToken
    }
  }`;

async function runQuery(query) {
  try {
    const url = `${ENDPOINT_URL}/graphql`;
    console.log('url', url);
    const payload = { query };
    const { data } = await axios.post(url, payload);

    if (data.errors) {
      throw new Error(
        `Encountered error running query: ${util.inspect(
          data.errors,
          false,
          null
        )}`
      );
    }

    const pools = data.data.pools;
    return pools;
  } catch (e) {
    console.log('error is: ', e);
  }
}

async function runTestQueries() {
  try {
    console.log('Fetching basic pools');
    const basicQueryPools = await runQuery(simpleQuery);
    console.log(util.inspect(basicQueryPools, false, null));
    console.log('Fetching detailed pools');
    const complexQueryPools = await runQuery(complexQuery);
    console.log(util.inspect(complexQueryPools, false, null));
  } catch (error) {
    console.log(error);
  }
}

runTestQueries();
