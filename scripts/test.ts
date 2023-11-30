console.log('Running test.ts!');
import axios from 'axios';
// import {
//   fetchPoolsFromChain,
//   sanitizePools,
// } from '../src/modules/chain-data/onchain';
// import { getChangedPools } from '../src/modules/pools';

(async () => {
  try {
    // console.log(`Loading Pools from chain, DB and Tokens. Network: ${1}`);
    // const [poolsFromChain] = await Promise.all([fetchPoolsFromChain(1)]);
    // console.log(`Sanitizing ${poolsFromChain.length} pools`);
    // const pools = sanitizePools(poolsFromChain);
    // const changedPools = getChangedPools(pools, []);
    // const pool = changedPools.find(
    //   p =>
    //     p.id ===
    //     '0xdacf5fa19b1f720111609043ac67a9818262850c000000000000000000000635'
    // );
    // console.log('Fetched', pools.length, pool);
    const payload = JSON.stringify({
      query: 'query { tokenGetCurrentPrices { address price }}',
    });
    const result = await axios.post('https://api-v3.balancer.fi', payload, {
      headers: {
        'Content-Type': 'application/json',
        ChainId: '1',
      },
    });
    console.log(result.data.data);
  } catch (e) {
    console.log(e);
  }
})();
