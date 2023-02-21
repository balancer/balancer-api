import {
  Network,
  NativeAssetAddress,
  NativeAssetPriceSymbol,
} from '@/constants';
import configs  from '@/config';

const { INFURA_PROJECT_ID } = process.env;

export default function template(templateString, templateVariables) {
  return templateString.replace(/{{(.*?)}}/g, (_, g) => templateVariables[g]);
}

export function getRpcUrl(networkId: number): string {
  if (!isValidNetworkId(networkId)) return '';

  const templateUrl = configs[networkId].rpc;
  const rpcUrl = template(templateUrl, {
    INFURA_PROJECT_ID
  });

  return rpcUrl;
}

export function getSubgraphUrl(networkId: number): string {
  if (!isValidNetworkId(networkId)) return '';

  return configs[networkId].subgraph;
}

export function isValidNetworkId(networkId: number): boolean {
  return Object.values(Network).includes(networkId);
}

export function getPlatformId(chainId: string | number): string | undefined {
  const mapping = {
    '1': 'ethereum',
    '42': 'ethereum',
    '137': 'polygon-pos',
    '42161': 'arbitrum-one',
    '100': 'xdai',
  };

  return mapping[chainId.toString()];
}

export function getNativeAssetAddress(chainId: string | number): string {
  const mapping = {
    '1': NativeAssetAddress.ETH,
    '42': NativeAssetAddress.ETH,
    '137': NativeAssetAddress.MATIC,
    '42161': NativeAssetAddress.ETH,
    '100': NativeAssetAddress.XDAI,
  };

  return mapping[chainId.toString()] || 'eth';
}

export function getNativeAssetPriceSymbol(chainId: string | number): string {
  const mapping = {
    '1': NativeAssetPriceSymbol.ETH,
    '42': NativeAssetPriceSymbol.ETH,
    '137': NativeAssetPriceSymbol.MATIC,
    '42161': NativeAssetPriceSymbol.ETH,
    '100': NativeAssetPriceSymbol.ETH,
  };

  return mapping[chainId.toString()] || 'eth';
}