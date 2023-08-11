import configs from '@/config';
import { getRpcUrl } from '@/modules/network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { getPoolSymbolFromContract, getPoolTypeFromContract, getPoolTypeFromId } from '@/modules/pools';
import { callGitHubWebhook } from '@/modules/github';
import { ALLOWLIST_POOL_ENDPOINT } from '@/constants';

export async function allowlistPool(chainId: number, poolId: string) {
  console.log(`Allowlisting pool ${poolId}`);

  const infuraUrl = getRpcUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const poolDescription = await getPoolSymbolFromContract(poolId, provider);

  let poolType = getPoolTypeFromId(poolId);
  if (!poolType) {
    poolType = await getPoolTypeFromContract(poolId, provider);
  }

  if (!poolType) {
    throw new Error('Unable to determine pool type from ID or Contract');
  }

  console.log(`pool type: ${poolType}`);

  let network = configs[chainId].network;
  if (network === 'mainnet') {
    network = 'ethereum';
  }

  const webhookData = {
    event_type: 'allowlist_pool',
    client_payload: {
      network,
      poolType,
      poolId,
      poolDescription,
    },
  };

  console.log('Sending to Github: ', webhookData);

  const response = await callGitHubWebhook(
    ALLOWLIST_POOL_ENDPOINT,
    webhookData
  );

  console.log('Got response from Github: ', response);

  if (response.status >= 400) {
    throw new Error('Failed to send allowlist request to Github');
  }
}
