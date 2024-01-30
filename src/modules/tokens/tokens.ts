import { BigNumber, ethers } from 'ethers';
import { Token } from './types';
import { Contract } from '@ethersproject/contracts';
import BeetsPriceFetcher from '@/modules/prices/beets-price-fetcher';
import { getToken, updateTokens } from '@/modules/dynamodb';
import { TokenPrices } from '@balancer-labs/sdk';

const log = console.log;

export async function updateTokenPrices(
  tokens: Token[],
) {
  const beetsPriceFetcher = new BeetsPriceFetcher();
  log(`fetching prices for ${tokens.length} tokens from beets API`);
  const beetsTokensWithPrices = await beetsPriceFetcher.fetch(tokens);
  log(`Saving ${beetsTokensWithPrices.length} updated tokens to DB`);
  await updateTokens(beetsTokensWithPrices);

  // Commenting out coingecko price fetcher, as it is not working because of rate limiting
  // const priceFetcher = new PriceFetcher(abortOnRateLimit);
  // log(`fetching prices for ${tokens.length} tokens from coingecko`);
  // const tokensWithPrices = await priceFetcher.fetch(tokens);
  // log(`Saving ${tokensWithPrices.length} updated tokens to DB`);
  // await updateTokens(tokensWithPrices);

  log('finished updating token prices');
}

export function tokensToTokenPrices(tokens: Token[]): TokenPrices {
  const tokenPrices: TokenPrices = {};
  tokens.forEach(token => {
    if (token.price) {
      tokenPrices[token.address] = token.price;
    }
  });

  return tokenPrices;
}


export async function getTokenInfo(
  provider,
  chainId: number,
  address: string
): Promise<Token> {
  const tokenAddress = ethers.utils.getAddress(address);
  const cachedInfo = await getToken(chainId, tokenAddress);
  if (cachedInfo !== undefined) {
    return cachedInfo;
  }

  const contract = new Contract(
    tokenAddress,
    [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ],
    provider
  );

  let symbol = `${tokenAddress.substr(0, 4)}..${tokenAddress.substr(40)}`;
  try {
    symbol = await contract.symbol();
    // eslint-disable-next-line no-empty
  } catch {}

  let decimals = 18;
  try {
    decimals = await contract.decimals();
    decimals = BigNumber.from(decimals).toNumber();
    // eslint-disable-next-line no-empty
  } catch {}

  const tokenInfo = {
    chainId,
    address: tokenAddress,
    symbol,
    decimals,
    price: {},
  };

  return tokenInfo;
}


export async function getSymbol(
  provider,
  chainId: number,
  tokenAddress: string
) {
  const tokenInfo = await getTokenInfo(provider, chainId, tokenAddress);
  return tokenInfo.symbol;
}
export async function getDecimals(
  provider,
  chainId: number,
  tokenAddress: string
) {
  const tokenInfo = await getTokenInfo(provider, chainId, tokenAddress);
  return tokenInfo.decimals;
}
