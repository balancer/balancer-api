import configs from '@/config';
import { getRpcUrl } from '@/modules/network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { callGitHubWebhook } from '@/modules/github';
import { ALLOWLIST_TOKEN_ENDPOINT } from '@/constants';

export async function allowlistTokens(chainId: number, tokenAddresses: string[]) {
  for (const address of tokenAddresses) {
    await allowlistToken(chainId, address);
  }
}

export async function allowlistToken(chainId: number, tokenAddress: string) {
  console.log(`Allowlisting token ${tokenAddress}`);

  const infuraUrl = getRpcUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const tokenDetailsContract = new Contract(
    tokenAddress,
    [
      'function symbol() view returns (string)',
    ],
    provider
  );

  const tokenSymbol = await tokenDetailsContract.symbol();
  console.log(`Got symbol ${tokenSymbol}`);

  const network = configs[chainId].network;
  const webhookData = {
    event_type: 'allowlist_token',
    client_payload: {
      network,
      tokenAddress,
      tokenSymbol,
    },
  };

  console.log('Sending to Github: ', webhookData);

  const response = await callGitHubWebhook(
    ALLOWLIST_TOKEN_ENDPOINT,
    webhookData
  );

  console.log('Got response from Github: ', response);

  if (response.status >= 400) {
    throw new Error('Failed to send allowlist request to Github');
  }
}
