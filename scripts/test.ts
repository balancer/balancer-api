console.log('Running test.ts!');
import { fetchPoolsFromChain } from '../src/modules/chain-data/onchain';

(async () => {
  try {
    console.log('Fetching pools...');
    const pools = await fetchPoolsFromChain(1);
    console.log('Fetched', pools.length, 'pools');
  } catch (e) {
    console.log(e);
  }
})();
