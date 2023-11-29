/**
 * Connects to the BeethovanX API, fetches latest token prices and returns them
 */

import { Token } from '@/modules/tokens';
import configs from '@/config';
import axios from 'axios';

const BEETS_API_URL =
  process.env.BEETS_API_URL || 'https://api-v3.balancer.fi/graphql';

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
    const gqlChain = configs[chainId].GqlChain || 'MAINNET';
    console.log('Fetching prices from beets API for chain: ', gqlChain);
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
