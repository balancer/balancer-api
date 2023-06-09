import configs  from '@/config';
import fetch from 'isomorphic-fetch';

const { GITHUB_PAT } = process.env;

const ALLOWLIST_POOL_ENDPOINT =
  'https://api.github.com/repos/timjrobinson/frontend-v2/dispatches';

export async function allowlistPool(
  chainId: number,
  poolType: string,
  poolId: string,
  poolDescription = ''
) {
  const network = configs[chainId].network;

  return fetch(ALLOWLIST_POOL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_PAT}`
    },
    body: JSON.stringify({
      event_type: 'allowlist_pool',
      client_payload: {
        network,
        poolType,
        poolId,
        poolDescription
      }
    })
  });
}
