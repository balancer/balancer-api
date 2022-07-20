import { Token } from "./types";
import PriceFetcher from './price-fetcher';
import { updateTokens } from "./data-providers/dynamodb";
import { TokenPrices } from "@balancer-labs/sdk";

const log = console.log;

export async function updateTokenPrices(tokens: Token[], abortOnRateLimit = false) {
  const priceFetcher = new PriceFetcher(abortOnRateLimit)
  log(`fetching prics for ${tokens.length} tokens`)
  const tokensWithPrices = await priceFetcher.fetch(tokens);
  log('writing to DB');
  await updateTokens(tokensWithPrices);
  log('finished updating token prices');
}

export function tokensToTokenPrices(tokens: Token[]): TokenPrices {
  const tokenPrices: TokenPrices = {};
  tokens.forEach((token) => {
    if (token.price) {
      tokenPrices[token.address] = token.price;
    }
  });

  return tokenPrices;
}