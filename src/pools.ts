import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { Pool, Token } from './types';
import { Liquidity, StaticPoolProvider, StaticTokenPriceProvider, TokenPrices, Pool as SDKPool } from '@balancer-labs/sdk';

export async function decoratePools(pools: Pool[], tokens: Token[]) {
  console.log("------- START Decorating pools --------")
  const tokenPrices: TokenPrices = {};
  tokens.forEach((token) => {
    // Strip price down to max 18 decimals.
    if (token.price) {
      const tokenPriceMatch = token.price.match(/[0-9]+\.[0-9]{0,18}/);
      const tokenPrice = tokenPriceMatch ? tokenPriceMatch[0] : '0';
      console.log("Token price: ", tokenPrice);
      const priceInETH = formatFixed(
        parseFixed('1', 36).div(parseFixed(tokenPrice, 18)),
        18
      );
      tokenPrices[token.address] = {
        eth: priceInETH,
      };
    }
  });

  // const sorPoolProvider = new SORPoolProvider(config);
  const poolProvider = new StaticPoolProvider(pools as SDKPool[]);
  const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);

  const liquidityProvider = new Liquidity(poolProvider, tokenPriceProvider);

  for (const pool of pools) {
    console.log("Calculating Pool: ", pool.id);
    let poolLiquidity = '0';
    try {
      poolLiquidity = await liquidityProvider.getLiquidity(pool as SDKPool);
    } catch (e) {
      console.log("Failed to calculate liquidity. Error is: ", e);
      console.log("Tokens are: ", pool.tokens.map((token) => {
        return {...token, ...{price: tokenPrices[token.address]}}
      }));
    }

    console.log("Current Liquidity: ", pool.totalLiquidity);
    console.log("Re-calculated liquidity: ", poolLiquidity);
    console.log("---");
  }

  console.log("------- END decorating pools --------")
}