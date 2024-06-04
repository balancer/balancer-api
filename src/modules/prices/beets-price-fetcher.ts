/**
 * Connects to the BeethovanX API, fetches latest token prices and returns them
 */

import { Token } from '@/modules/tokens';
import configs from '@/config';
import axios from 'axios';

const BEETS_API_URL =
  process.env.BEETS_API_URL || 'https://api-v3.balancer.fi/graphql';

export const nativeAssetMap = {
  1: {
      symbol: 'eth',
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  10: {
      symbol: 'eth',
      address: '0x4200000000000000000000000000000000000006',
  },
  100: {
      symbol: 'xdai',
      address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  },
  137: {
      symbol: 'matic',
      address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  },
  1101: {
      symbol: 'eth',
      address: '0x4f9a0e7fd2bf6067db6994cf12e4495df938e6e9',
  },
  8453: {
      symbol: 'eth',
      address: '0x4200000000000000000000000000000000000006',
  },
  42161: {
      symbol: 'eth',
      address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  },
  43114: {
      symbol: 'avax',
      address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  },
  252: {
      symbol: 'frxeth',
      address: '0xfc00000000000000000000000000000000000006',
  },
  34443: {
      symbol: 'eth',
      address: '0x4200000000000000000000000000000000000006',
  },
}

class BeetsPriceFetcher {
  async fetch(tokens: Token[]): Promise<Token[]> {
    const tokenPricesByChain: Record<number, Record<string, number>> = {};
    const chains = new Set<number>();
    tokens.forEach((token: Token) => {
      chains.add(token.chainId);
    });

    for (const chainId of chains) {
      tokenPricesByChain[chainId] = await this.fetchFromBeetsAPI(chainId);
    }

    const tokensWithPrices: Token[] = tokens.map(token => {
      if (tokenPricesByChain[token.chainId][token.address]) {
        token.price = token.price || {};
        token.price.usd =
          tokenPricesByChain[token.chainId][token.address].toString();
        token.price[nativeAssetMap[token.chainId].symbol] =
          (tokenPricesByChain[token.chainId][token.address] / 
          tokenPricesByChain[token.chainId][nativeAssetMap[token.chainId].address]).toString();
      }
      return token;
    });

    return tokensWithPrices;
  }

  async fetchFromBeetsAPI(chainId: number): Promise<Record<string, number>> {
    const unspupportedChains = [5, 11155111];
    if (unspupportedChains.includes(chainId)) {
      return {};
    }

    let gqlChain = 'MAINNET';
    try {
      gqlChain = configs[chainId].GqlChain;
    } catch (e) {
      console.error(`Chain ${chainId} not supported`);
      return {};
    }

    const payload = JSON.stringify({
      query: `query { tokenGetCurrentPrices(chains: [${gqlChain}]) { address price }}`,
    });
    const result = await axios.post(BEETS_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        ChainId: chainId.toString(),
      },
    });

    if (result.data.errors) {
      console.error('Failed to fetch from beets API: ', result.data.errors);
      return {};
    }

    const tokenPrices = result.data.data.tokenGetCurrentPrices;
    const tokenPricesMap = Object.fromEntries(
      tokenPrices.map(token => [token.address, token.price])
    );

    return tokenPricesMap;
  }
}

export default BeetsPriceFetcher;
