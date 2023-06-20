import configs from '@/config';
import { getRpcUrl } from '@/modules/network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { convertPoolIdToAddress } from '@/modules/pools';
import { Contract } from '@ethersproject/contracts';
import { callGitHubWebhook } from '@/modules/github';
import { ALLOWLIST_POOL_ENDPOINT } from '@/constants';


export async function allowlistPool(chainId: number, poolId: string) {
  console.log(`Allowlisting pool ${poolId}`);

  const infuraUrl = getRpcUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const poolAddress = convertPoolIdToAddress(poolId);

  const poolDetailsContract = new Contract(
    poolAddress,
    [
      'function symbol() view returns (string)',
      'function version() view returns (string)',
    ],
    provider
  );

  let poolType = 'Weighted';
  let poolDescription = '';

  try {
    poolDescription = await poolDetailsContract.symbol();
  } catch (e) {
    console.error(
      'Unable to fetch symbol for pool, continuing with empty description'
    );
  }

  try {
    const poolInfoJSON = await poolDetailsContract.version();
    console.log('Got pool info: ', poolInfoJSON);
    const poolInfo = JSON.parse(poolInfoJSON);

    switch (poolInfo.name) {
      case 'WeightedPool':
        poolType = 'Weighted';
        break;
      case 'ComposableStablePool':
        poolType = 'Stable';
        break;
    }
  } catch (e) {
    console.error('Unable to read pool type from contract. Aborting.');
    throw e;
  }

  console.log(`pool type: ${poolType}`);

  const network = configs[chainId].network;

  const response = await callGitHubWebhook(ALLOWLIST_POOL_ENDPOINT, {
    event_type: 'allowlist_pool',
    client_payload: {
      network,
      poolType,
      poolId,
      poolDescription,
    },
  });

  console.log('Got response from Github: ', response);

  if (response.status >= 400) {
    throw new Error('Failed to send allowlist request to Github');
  }
}

