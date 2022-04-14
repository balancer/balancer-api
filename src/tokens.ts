import { Token } from "./types";
import PriceFetcher from './price-fetcher';
import { updateTokens } from "./dynamodb";

const log = console.log;

export async function updateTokenPrices(tokens: Token[], abortOnRateLimit = false) {
  const tokenFetcher = new PriceFetcher(abortOnRateLimit)
  log(`fetching prics for ${tokens.length} tokens`)
  const tokensWithPrices = await tokenFetcher.fetch(tokens);
  log('writing to DB');
  await updateTokens(tokensWithPrices);
  log('finished updating token prices');
}
