import { Network } from '@/constants';
import configs from '@/config';

const { INFURA_PROJECT_ID, ALCHEMY_KEY, SUBGRAPH_API_KEY } = process.env;

export default function template(templateString, templateVariables) {
  return templateString.replace(/{{(.*?)}}/g, (_, g) => templateVariables[g]);
}

export function getRpcUrl(networkId: number): string {
  requireValidNetworkId(networkId);

  // Get the RPC from env, if it's not set, use the default one
  const envRpcUrl = process.env[`RPC_URL_${networkId}`];
  const templateUrl = envRpcUrl || configs[networkId].rpc;
  if (templateUrl.match(/INFURA_PROJECT_ID/) && INFURA_PROJECT_ID == null) {
    throw new Error(
      `INFURA_PROJECT_ID env variable must be set for network ${networkId}`
    );
  }
  if (templateUrl.match(/ALCHEMY_KEY/) && ALCHEMY_KEY == null) {
    throw new Error(
      `ALCHEMY_KEY env variable must be set for network ${networkId}`
    );
  }

  const rpcUrl = template(templateUrl, {
    INFURA_PROJECT_ID,
    ALCHEMY_KEY,
  });

  return rpcUrl;
}

export function getSubgraphUrl(networkId: number): string {
  requireValidNetworkId(networkId);

  const templateUrl = configs[networkId].subgraph;
  if (templateUrl.match(/SUBGRAPH_API_KEY/) && SUBGRAPH_API_KEY == null) {
    throw new Error(
      `SUBGRAPH_API_KEY env variable must be set for network ${networkId}`
    );
  }

  const subgraphUrl = template(templateUrl, {
    SUBGRAPH_API_KEY,
  });

  return subgraphUrl;
}

export function getBlockNumberSubgraphUrl(networkId: number): string {
  requireValidNetworkId(networkId);

  const templateUrl = configs[networkId].blocksSubgraph;
  if (templateUrl.match(/SUBGRAPH_API_KEY/) && SUBGRAPH_API_KEY == null) {
    throw new Error(
      `SUBGRAPH_API_KEY env variable must be set for network ${networkId}`
    );
  }

  const subgraphUrl = template(templateUrl, {
    SUBGRAPH_API_KEY,
  });

  return subgraphUrl;
}

export function getGaugesSubgraphUrl(networkId: number): string {
  requireValidNetworkId(networkId);

  const templateUrl = configs[networkId].gaugesSubgraph;
  if (templateUrl.match(/SUBGRAPH_API_KEY/) && SUBGRAPH_API_KEY == null) {
    throw new Error(
      `SUBGRAPH_API_KEY env variable must be set for network ${networkId}`
    );
  }

  const subgraphUrl = template(templateUrl, {
    SUBGRAPH_API_KEY,
  });

  return subgraphUrl;
}

export function isValidNetworkId(networkId: number): boolean {
  return Object.values(Network).includes(networkId);
}

export function requireValidNetworkId(networkId: number): void {
  if (!isValidNetworkId(networkId)) {
    throw new Error(`Invalid network ID ${networkId}`);
  }
}

export function getPlatformId(chainId: string | number): string | undefined {
  return configs[chainId].coingecko.platformId;
}

export function getNativeAssetPriceSymbol(chainId: string | number): string {
  return configs[chainId].coingecko.nativeAssetPriceSymbol || 'eth';
}
