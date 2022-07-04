import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { Token } from "./types";
import PriceFetcher from './price-fetcher';
import { updateTokens } from "./dynamodb";
import { TokenPrices } from "@balancer-labs/sdk";

const log = console.log;

export async function updateTokenPrices(tokens: Token[], abortOnRateLimit = false) {
  const priceFetcher = new PriceFetcher(abortOnRateLimit)
  log(`fetching prics for ${tokens.length} tokens`)
  const tokensWithPrices = await priceFetcher.fetch(tokens);
  tokensWithPrices.forEach((token) => {
    if (token.address === '0x82af49447d8a07e3bd95bd0d56f35241523fbab1') {
      console.log("WETH on arbitrum: ", token);
    }
  })
  log('writing to DB');
  await updateTokens(tokensWithPrices);
  log('finished updating token prices');
}

export function tokensToTokenPrices(tokens: Token[]): TokenPrices {
  const tokenPrices: TokenPrices = {};
  tokens.forEach((token) => {
    if (token.price) {
      // Strip price down to max 18 decimals.
      const tokenPriceMatch = token.price.match(/[0-9]+\.[0-9]{0,18}/);
      const tokenPrice = tokenPriceMatch ? tokenPriceMatch[0] : '0';
      const priceInETH = tokenPrice !== '0' ? formatFixed(
        parseFixed('1', 36).div(parseFixed(tokenPrice, 18)),
        18
      ) : '0';
      tokenPrices[token.address] = {
        eth: priceInETH,
      };
    }
  });

  return tokenPrices;
}